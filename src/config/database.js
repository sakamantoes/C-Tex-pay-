import {Sequelize} from 'sequelize';
import envConfig from './constant.js';

const sequelize = new Sequelize(envConfig.DB_NAME, envConfig.DB_USER, envConfig.DB_PASSWORD, {
    host: envConfig.DB_HOST,
    dialect: 'mysql',
    port: envConfig.DB_PORT,

    logging: false, // Disable logging; default: console.log
})

export default sequelize;