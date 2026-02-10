import path from 'path';
import dotenv from 'dotenv';

dotenv.config({
    path: path.resolve(process.cwd(), '.env.test'),
    override: true,
    quiet: true,
});

process.env.NODE_ENV = 'test';
