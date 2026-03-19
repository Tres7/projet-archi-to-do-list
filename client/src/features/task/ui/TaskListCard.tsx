import type { Task } from '../model/types';
import { useTasks } from '../model/useTasks';
import AddTaskForm from './AddTaskForm';
import TaskItem from './TaskItem';

interface TaskListCardProps {
    projectId: string;
    tasks: Task[];
    refreshProject: () => Promise<void>;
}

export default function TaskListCard({ projectId, tasks, refreshProject }: TaskListCardProps) {
    const { createTask, toggleStatus, deleteTask } = useTasks(projectId, refreshProject);

    return (
        <>
            <AddTaskForm onNewTask={createTask} />
            {tasks.length === 0 && (
                <p className="text-center">No tasks yet! Add one above!</p>
            )}
            {tasks.map((task) => (
                <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={toggleStatus}
                    onDelete={deleteTask}
                />
            ))}
        </>
    );
}
