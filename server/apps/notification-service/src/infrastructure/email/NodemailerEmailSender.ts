import nodemailer from 'nodemailer';
import type { EmailSender } from '../../domain/ports/EmailSender.ts';

function env(name: string, fallback: string): string {
    const value = process.env[name];
    return value && value.trim() ? value : fallback;
}

export class NodemailerEmailSender implements EmailSender {
    private readonly transporter = nodemailer.createTransport({
        host: env('SMTP_HOST', 'localhost'),
        port: Number(env('SMTP_PORT', '1025')),
        secure: env('SMTP_SECURE', '0') === '1',
    });

    private readonly from = env('SMTP_FROM', 'no-reply@todo.local');
    private readonly dryRun = env('NOTIFY_DRY_RUN', '0') === '1';

    async send(input: {
        to: string;
        subject: string;
        text: string;
        html?: string;
    }): Promise<void> {
        if (this.dryRun) {
            console.log('[notification:email:dry-run]', input);
            return;
        }

        await this.transporter.sendMail({
            from: this.from,
            to: input.to,
            subject: input.subject,
            text: input.text,
            html: input.html,
        });
    }
}
