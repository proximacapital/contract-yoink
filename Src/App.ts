#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "fs";
import { EtherscanParser, NETWORKS, TEtherscanCodeResult, TNetwork } from "./EtherscanParser";

const USER_ARGS_OFFSET: number = 2;

function LogSuccess(aFileName: string): void
{
    console.log("Successfully wrote", aFileName);
}

async function YoinkAndWrite(aNetwork: TNetwork, aAddress: string): Promise<void>
{
const lParser: EtherscanParser = new EtherscanParser(aNetwork);
    const lAddress: string = aAddress.trim();
    const lResult: TEtherscanCodeResult = await lParser.GetFlattenedSourceCode(lAddress);
    const lFileName: string = `./${lAddress}.sol`;

    fs.writeFile(lFileName, lResult.code, (): void => LogSuccess(lFileName));
}


async function main(): Promise<void>
{
    const lConsoleArgs: string[] = process.argv.slice(USER_ARGS_OFFSET);

    if (lConsoleArgs.length <= 1)
    {
        let lValidNetworks: string = "";
        NETWORKS.forEach((aNetwork: TNetwork): void => { lValidNetworks += `${aNetwork} | ` });

        console.error("Expected network followed by 1 or more contract addresses");
        console.error("Valid network options are: " + lValidNetworks)

        return;
    }

    // TODO: default network to mainnet, allow override via --network
    const lNetwork: TNetwork = lConsoleArgs.shift() as TNetwork;

    lConsoleArgs.forEach((aAddress: string): Promise<void> => YoinkAndWrite(lNetwork, aAddress));
}

main();
