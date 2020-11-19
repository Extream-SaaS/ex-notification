if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const axios = require('axios');
const exauthURL = process.env.EXAUTH;
const Firestore = require('@google-cloud/firestore');
const admin = require('firebase-admin');
const projectId = 'stoked-reality-284921';
const db = new Firestore({
  projectId,
});
const emailService = require('./services/email');
const itemTypes = {
  webrtc: require('./services/webrtc')(db, admin),
};
const publish = (
  topicName,
  source,
  data = undefined
) => {
  const {PubSub} = require('@google-cloud/pubsub');
  // Instantiates a client
  const pubsub = new PubSub({projectId});

  async function publishMessage() {
    const sourceStr = data ? `-${source}` : '';
    const dataBuffer = Buffer.from(JSON.stringify(!data ? source : data));

    const messageId = await pubsub.topic(`${topicName}${sourceStr}`).publish(dataBuffer);
    return messageId;
  }

  return publishMessage();
};

const registerUser = async (token, user) => {
  const password = crypto.randomBytes(32).toString('hex');
  const body = Object.entries({
    username: user,
    password: await bcrypt.hash(password, 10),
    user_type: 'audience',
    email: user,
    user: JSON.stringify({}),
    notify: false,
  })
  .map(([key, value]) => `${key}=${value}`)
  .join('&');
  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${token}`
    }
  };
  try {
    const resp = await axios.post(`${exauthURL}/auth/invite`, body, config);
    if (resp.status === 409) {
      return error.response.data;
    } else if (resp.status === 400) {
      throw new Error('invalid email');
    } else if (resp.status !== 200) {
      throw new Error(resp);
    }
    return resp.data;
  } catch (error) {
    if (error.response.status === 409) {
      return error.response.data;
    } else if (error.response.status === 400) {
      throw new Error('invalid email');
    } else if (error.response.status !== 200) {
      throw new Error('malformed payload');
    }
  }
};

const registerUsers = (requester, socketId, source, users, { itemId, instanceId, itemType, onComplete }) => {
  const token = requester.token;
  users.forEach(async (email) => {
    try {
      const user = await registerUser(token, email);
      const callback = await itemTypes[itemType][onComplete](user.id, itemId, instanceId);
      // need to send this user back as a status update for the socket
      if (callback) {
        await publish('ex-gateway', source, { domain: 'consumer', action: 'notification', command: 'update', payload: { itemId, instanceId, itemType, action: onComplete, user }, requester, socketId });
      }
    } catch (err) {
      await publish('ex-gateway', source, { domain: 'consumer', action: 'notification', command: 'update', error: err.message, payload: { itemId, instanceId, itemType, action: onComplete }, requester, socketId });
    }
  });
};

/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
exports.manage = async (event, context, callback) => {
  const message = event && event.data ? JSON.parse(Buffer.from(event.data, 'base64').toString()) : null;
  if (message === null) {
    callback();
  }
  const {method, recipients, template, payload, user, source, socketId} = message;
  switch (method) {
    case 'email':
      try {
        const templateRef = db.collection('notification-templates').doc(template);
        const templateDoc = await templateRef.get();
        if (!templateDoc.exists) {
          throw new Error('template not found');
        }
        const templateInstance = templateDoc.data();
        const docRef = db.collection('notifications').doc();

        await docRef.set({
          method,
          recipients,
          template,
          templateId: templateInstance.templateId,
          from: user,
          ...payload,
          addedBy: user.id,
          addedAt: Firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        recipients.forEach((email) => {
          emailService.send(email, templateInstance.templateId, payload.content, payload.subject, templateInstance.from);
        });
        if (payload.register) {
          registerUsers(
            user,
            socketId,
            source,
            recipients,
            payload
          );
        }
        if (process.env.NODE_ENV !== 'production') {
          console.log({ ...payload });
          return { ...payload };
        }
        await publish('ex-gateway', source, { domain: 'consumer', action: 'notification', command: 'send', payload: { ...payload, id: docRef.id }, user, socketId })
        callback();
      } catch (error) {
        console.log(error);
        await publish('ex-gateway', source, { error: error.message, domain: 'consumer', action: 'notification', command: 'send', payload, user });
        callback(0);
      }
      break;
  }
};
