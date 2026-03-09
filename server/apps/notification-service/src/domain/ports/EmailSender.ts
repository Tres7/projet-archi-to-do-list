export interface EmailSender {
    send(input: {
        to: string;
        subject: string;
        text: string;
        html?: string;
    }): Promise<void>;
}
