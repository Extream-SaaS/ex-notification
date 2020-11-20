class WebrtcCallback {
    constructor(db, admin) {
        this.db = db;
        this.admin = admin;
    }
    async addParticipant(userId, itemId, instanceId) {
        const itemRef = this.db.collection('sessions').doc(itemId);
        const item = await itemRef.get();
        if (!item.exists) {
            throw new Error('webrtc item not found');
        }
        const instanceRef = itemRef.collection('instances').doc(instanceId);
        const instance = await instanceRef.get();
        if (!instance.exists) {
            console.log('no instance');
            throw new Error('webrtc instance not found');
        }
        await instanceRef.set({
            participants: this.admin.firestore.FieldValue.arrayUnion(userId),
            hello: true,
        }, { merge: true });
        return true;
    }
    async getParticipants(itemId, instanceId) {
        const itemRef = this.db.collection('sessions').doc(itemId);
        const item = await itemRef.get();
        if (!item.exists) {
            throw new Error('webrtc item not found');
        }
        const instanceRef = itemRef.collection('instances').doc(instanceId);
        const instance = await instanceRef.get();
        if (!instance.exists) {
            throw new Error('webrtc instance not found');
        }
        const data = instance.data();
        return data.participants;
    }
}

module.exports = (db, admin) => {
    return new WebrtcCallback(db, admin);
};
