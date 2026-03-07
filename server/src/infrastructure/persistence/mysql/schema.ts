const taskTableSchema = `
    CREATE TABLE IF NOT EXISTS tasks
    (
        id varchar(36) PRIMARY KEY,
        name varchar(255),
        description TEXT,
        status varchar(16),
        created_at datetime,
        user_id varchar(36),
        project_id varchar(36)
    )
`;

const userTableSchema = `
    CREATE TABLE IF NOT EXISTS users 
    (
        id varchar(36) PRIMARY KEY, 
        user_name varchar(255) UNIQUE, 
        passwordHash varchar(255),
        email varchar(255) UNIQUE
    )
`;

const projectTableSchema = `
    CREATE TABLE IF NOT EXISTS projects
    (
        id varchar(36) PRIMARY KEY,
        name varchar(255),
        description varchar(255),
        status varchar(10),
        uncomplete_task_count INT DEFAULT 0,
        tasks TEXT,
        owner_id varchar(36)
    )
`;

export { taskTableSchema, userTableSchema, projectTableSchema };
