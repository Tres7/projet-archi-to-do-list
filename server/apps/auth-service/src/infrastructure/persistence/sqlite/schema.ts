const userTableSchema = `
    CREATE TABLE IF NOT EXISTS users 
    (
        id varchar(36) PRIMARY KEY, 
        user_name varchar(255) UNIQUE, 
        passwordHash varchar(255),
        email varchar(255) UNIQUE
    )
`;

export { userTableSchema };
