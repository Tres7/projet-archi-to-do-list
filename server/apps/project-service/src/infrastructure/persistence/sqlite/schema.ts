const projectTableSchema = `
    CREATE TABLE IF NOT EXISTS projects
    (
        id varchar(36) PRIMARY KEY,
        name varchar(255),
        description varchar(255),
        status varchar(10),
        uncomplete_task_count integer DEFAULT 0,
        owner_id varchar(36)
    )
`;

export { projectTableSchema };
