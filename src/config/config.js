import dotenv from 'dotenv';
dotenv.config();
export default {
    HOST: process.env.HOST || '<<ERROR>> NO ENCONTRE EL HOST',
    PORT: process.env.PORT || '<<ERROR>> NO ENCONTRE EL PORT',
    API_URL: process.env.API_URL || '/api/v1',
    CONNECTION_STRING: process.env.CONNECTION_STRING || '<<ERROR>> NO SE ENCUENTRA',
    DATABASE: process.env.DATABASE || '<<ERROR>> NO SE ENCUENTRA',
    DB_PASSWORD: process.env.DB_PASSWORD || '<<ERROR>> NO SE ENCUENTRA',
    DB_USER: process.env.DB_USER || '<<ERROR>> NO SE ENCUENTRA',
    JWT_SECRET: process.env.JWT_SECRET || '<<ERROR>> NO SE ENCUENTRA',
}
//Se usa para cominicarse con .env para tener host, port o api url.