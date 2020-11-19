class EmailService {
    constructor(fromAddress) {
        this.from = fromAddress;
        this.sgMail = require('@sendgrid/mail');
        this.sgMail.setApiKey(process.env.SENDMAIL_KEY);
    }

    async send(to, templateId, templateData, subject, from = this.from) {
        const msg = {
            to,
            from,
        };

        if (subject) {
            msg.subject = subject;
        }
        if (templateId) {
            msg.templateId = templateId;
            if (templateData) {
                msg.dynamicTemplateData = templateData;
            }
        }

        try {
            const sent = await this.sgMail.send(msg);
            console.log('sent', sent);
        } catch (error) {
            if (error.response) {
                console.error(error.response.body);
                throw error.response.body;
            }
            throw new Error(error);
        }
    }
}

module.exports = new EmailService('noreply@extream.app');
