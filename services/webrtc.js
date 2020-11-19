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
        const instanceRef = session.collection('instances').doc(instanceId);
        const instance = await instanceRef.get();
        if (!instance.exists) {
            throw new Error('webrtc instance not found');
        }
        await instanceRef.set({
            participants: this.admin.firestore.FieldValue.arrayUnion(userId),
        }, {
            merge: true
        });
        return true;
    }
}

module.exports = (db, admin) => {
    return new WebrtcCallback(db, admin);
};
