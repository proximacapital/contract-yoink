#!/usr/bin/env node
/* eslint-disable no-console */
import PackageJSON from "@Root/package.json";
import { program } from "commander";
import fs from "fs";
import { EtherscanParser, TEtherscanCodeResult, TNetwork } from "./EtherscanParser";


// Cofigure commander
program
    .version(PackageJSON.version)
    .option("-n --network <string>");


// Handle user input
function LogSuccess(aFileName: string): void
{
    console.log("Successfully wrote", aFileName);
}

async function YoinkAndWrite(aNetwork: TNetwork | undefined, aAddress: string): Promise<void>
{
    const lParser: EtherscanParser = new EtherscanParser(aNetwork);
    const lAddress: string = aAddress.trim();
    const lResult: TEtherscanCodeResult = await lParser.GetFlattenedSourceCode(lAddress);
    const lFileName: string = `./${lAddress}.sol`;

    fs.writeFile(lFileName, lResult.code, (): void => LogSuccess(lFileName));
}


async function main(): Promise<void>
{
    program.parse();
    // if (lConsoleArgs.length <= 1)
    // {
    //     let lValidNetworks: string = "";
    //     NETWORKS.forEach((aNetwork: TNetwork): void => { lValidNetworks += `${aNetwork} | `; });
    //
    //     console.error("Expected network followed by 1 or more contract addresses");
    //     console.error("Valid network options are: " + lValidNetworks);
    //
    //     return;
    // }

    const lAddresses: string[] = program.args;
    const lNetwork: TNetwork | undefined = program.opts().network;
    lAddresses.forEach((aAddress: string): Promise<void> => YoinkAndWrite(lNetwork, aAddress));
}

main();
