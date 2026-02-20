const todoTableSchema = `
    CREATE TABLE IF NOT EXISTS todo_items 
    (
        id varchar(36), 
        name varchar(255), 
        completed boolean,
        user_id varchar(36),
        
        PRIMARY KEY (id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`;

const userTableSchema = `
    CREATE TABLE IF NOT EXISTS users 
    (
        id varchar(36) PRIMARY KEY, 
        user_name varchar(255) UNIQUE, 
        passwordHash varchar(255)
    )
`;

export { todoTableSchema, userTableSchema };
