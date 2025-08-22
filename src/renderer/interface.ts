import { TaskStatus, TaskClient } from "../tasks/manager";

export interface RendererTask {
    id: string;
    prompt: string;
    summary: string[];
    mode: string;
    client: TaskClient;
    status: TaskStatus;
    archived: boolean;
}

export interface RendererInitializationData {
    tasks: RendererTask[];
    workerActive: boolean;
}

export type MessageFromRenderer = {
    type: 'submitTasks' | 'cancelTasks' | 'archiveTasks' | 'unarchiveTasks' | 'deleteTasks'
    taskIds: string[],
} | {
    type: 'pauseWorker' | 'resumeWorker'
} | {
    type: 'moveSelectedTasks',
    selectedTasks: string[],
    targetTask: string,
    position: 'before' | 'after',
};

export type MessageToRenderer = {
    type: 'statusUpdated',
    tasks: RendererTask[],
    workerActive: boolean,
};
