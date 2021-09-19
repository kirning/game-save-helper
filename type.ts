export type TConfig = {
    projects: TProject[]
}

export type TProject = {
    name: string,
    path: TProjectPath
}

export type TProjectPath = {
    saveData: string,
    back: string,
    restore: string
}