
export type ProjectStatus = 'opened' | 'closed';


export class Project {
    constructor (
        public readonly id: string,
        public name: string,
        public description: string,
        public status: ProjectStatus,
        public uncompleteTaskCount: number,
        public tasks: string[],
        public owner_id: string
    ) {}
}