const { manage } = require('./index');
let payload, data, event;
payload = {
  method: 'email',
  recipients: [
    'rich@extream.app'
  ],
  template: 'webrtc-invite',
  payload: {
    content: {
      title: 'A meeting between folks',
      link: 'http://localhost:8889/deploration-piscivorous-perceptual',
      from: 'Demo User'
    },
    itemId: 'fF9KUD0z1Ic5zGeEZd8O',
    instanceId: 'deploration-piscivorous-perceptual',
    itemType: 'webrtc',
    onComplete: 'addParticipant',
    register: true,
    id: 'DED9FBlrEk1sM9TlaeuA'
  },
  user: {
    id: 'e91d0d10-b63c-4aec-8435-1d99d8042042',
    username: 'demo@sublime.productions',
    email: 'demo@sublime.productions',
    firstName: 'Demo',
    lastName: 'User',
    fields: {},
    user_type: 'audience',
    eventId: '08c3d14e-2cfe-4262-a536-f64c25310d52',
    token: '8769f19d9f7942c76b1bfdeaccb51534c2a93187'
  },
  source: 'rw-local',
  eventId: null
}
data = Buffer.from(JSON.stringify(payload)).toString('base64');
event = {
  data
};
manage(event, '', (resp) => {
  console.log(resp);
  console.log('executed');
  process.exit();
});