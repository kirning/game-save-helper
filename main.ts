import fs from 'fs';
import { TConfig, TProjectPath } from './type';
import { zip } from 'compressing';
import paths from 'path';
import dayjs from 'dayjs';
import nopt from 'nopt';

const SAVE_DATA_PATH = 'saveData';
const FILE_NAME_DATE_FORMAT = 'YYYYMMDDHHmmss';

function main() {
    const knowOptions = {
        save: Boolean,
        restore: Boolean
    }

    const args = nopt(knowOptions, {}, process.argv, 2);
    console.log("接受的参数 %s", args);
    const configStr = fs.readFileSync('./config.json', "utf-8");
    const mConfig = JSON.parse(configStr) as TConfig;
    for (const project of mConfig.projects) {
        const pName = project.name;
        console.info("开始处理 %s 项目", pName);
        const path = project.path;
        const saveData = path.saveData;
        if (!saveData) {
            console.error("配置中没有找到需要配分的路径，请指定");
            return;
        }
        console.info("数据存储路径 %s", saveData);
        if (args.save) {
            save(pName, saveData);
        }
        if (args.restore) {
            restore(pName, path);
        }
    }
}

async function restore(pName: string, projectPath: TProjectPath) {
    console.info("备份 %s 当前记录", pName);
    const saveData = projectPath.saveData;
    const isExists = fs.existsSync(saveData);
    if (!isExists) {
        console.info("没有找到当前记录，跳过");
        await handleRestore(saveData, pName, isExists);
    } else {
        const backPathFile = saveData + "_back.zip";
        // await yasuo(saveData, backPathFile)
        await zip.compressDir(saveData, backPathFile);
        console.info("%s 备份成功!!!, 备份在 ", pName, backPathFile)
    }
    try {
        await handleRestore(saveData, pName, isExists);
        console.info("恢复成功");
    } catch (err) {
        if (err instanceof Error) {
            console.error("%s 备份失败", err.message);
        }
    }
}

function handleRestore(saveData: string, pName: string, isRecordExists: boolean) {
    console.info("读取备份记录");
    const fileList = fs.readdirSync(paths.join(SAVE_DATA_PATH, pName));
    if (fileList.length === 0) {
        console.error("没有找到备份记录");
        return;
    }
    console.info("找到了以下备份记录 %j", fileList);
    let lastBackFileName: string;
    if (fileList.length > 1) {
        lastBackFileName = fileList.sort((o1, o2) => {
            const o1Day = dayjs(o1, FILE_NAME_DATE_FORMAT);
            const o2Day = dayjs(o2, FILE_NAME_DATE_FORMAT);
            return o1Day.isAfter(o2Day) ? 1 : -1
        })[0];
    } else {
        lastBackFileName = fileList[0];
    }
    console.info("最新的备份记录为 %s", lastBackFileName);
    const lastBackFile = paths.join(SAVE_DATA_PATH, pName, lastBackFileName);
    if (isRecordExists) {
        console.info("删除现有记录 %s", saveData);
        fs.rmSync(saveData, { recursive: true });
    }
    const restorePath = paths.join(saveData, "..");
    console.info("恢复备份记录到 %s", restorePath);
    return zip.uncompress(lastBackFile, restorePath);
}

function save(pName: string, saveData: string) {
    const timeStr = dayjs().format(FILE_NAME_DATE_FORMAT);
    const backFileName = timeStr + ".zip";
    const saveDataPath = paths.join("saveData", pName);
    const saveDataFile = paths.join(saveDataPath, backFileName);
    const isExists = fs.existsSync(saveDataPath);
    if (!isExists) {
        fs.mkdirSync(saveDataPath);
    }
    console.info("把 %s 备份到 %s", saveData, saveDataFile);

    zip.compressDir(saveData, saveDataFile).then(() => {
        console.info("%s 备份成功!!!", pName)
    }).catch(err => {
        console.error("%s 备份失败", err.message);
    })
}

main();
