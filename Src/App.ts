#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "fs";
import { EtherscanParser, TEtherscanCodeResult } from "./EtherscanParser";

const USER_ARGS_OFFSET: number = 2;
const lParser: EtherscanParser = new EtherscanParser();

function LogSuccess(aFileName: string): void
{
    console.log("Successfully wrote", aFileName);
}

async function YoinkAndWrite(aAddress: string): Promise<void>
{
    const lAddress: string = aAddress.trim();
    const lResult: TEtherscanCodeResult = await lParser.GetFlattenedSourceCode(lAddress);
    const lFileName: string = `./${lAddress}.sol`;

    fs.writeFile(lFileName, lResult.code, (): void => LogSuccess(lFileName));
}


async function main(): Promise<void>
{
    const lConsoleArgs: string[] = process.argv.slice(USER_ARGS_OFFSET);

    if (lConsoleArgs.length === 0)
    {
        console.error("Not a valid contract address");
        return;
    }

    lConsoleArgs.forEach((aAddress: string): Promise<void> => YoinkAndWrite(aAddress));
}

main();
