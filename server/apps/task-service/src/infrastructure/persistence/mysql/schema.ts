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

export { taskTableSchema };
