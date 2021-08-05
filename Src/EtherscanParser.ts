import axios from "axios";

export const NETWORKS = <const>["mainnet", "ropsten", "kovan", "rinkeby", "goerli", "bsc"]; // eslint-disable-line

type TParsedEtherscanSource = [ filename: string, code: { content: string } ];
export type TNetwork = typeof NETWORKS[number];
export type TEtherscanCodeResult = { code: string; filename: string };

// @source: Yoinked from https://github.com/naddison36/sol2uml
export class EtherscanParser
{
    private readonly mAPIKey: string;
    private readonly mURL: string;

    public constructor(aNetwork: TNetwork = "mainnet")
    {
        if (!NETWORKS.includes(aNetwork))
        {
            throw new Error(
                `Invalid aNetowrk "${aNetwork}". Must be one of ${NETWORKS}`,
            );
        }

        if (aNetwork === "mainnet")
        {
            this.mURL = "https://api.etherscan.io/api";
        }
        else if (aNetwork === "bsc")
        {
            this.mURL = "https://api.bscscan.com/api"
        }
        else
        {
            this.mURL = `https://api-${aNetwork}.etherscan.io/api`;
        }

        this.mAPIKey = aNetwork === "bsc"
            ? "VDAE16Y6TB5FJHIIP9BJBC8C2ZG1Y6CKA2"  // Personal key, don't spam it thanks
            : "ZAD4UI2RCXCQTP38EXS3UY2MPHFU5H9KB1"; // Sorry nick, still stinging off your key mate
    }

    /**
     * Calls Etherscan to get the verified source code for the specified contract address
     * @param aContractAddress Ethereum contract address with a 0x prefix
     */
    private async GetSourceCode(aContractAddress: string): Promise<TEtherscanCodeResult[]>
    {
        const lDescription: string = `get verified source code for address ${aContractAddress} from Etherscan API.`;

        try
        {
            const response: any = await axios.get(
                this.mURL,
                {
                    params: {
                        module: "contract",
                        action: "getsourcecode",
                        address: aContractAddress,
                        apikey: this.mAPIKey,
                    },
                },
            );

            if (!Array.isArray(response?.data?.result))
            {
                throw new Error(
                    `Failed to ${lDescription}. No result array in HTTP data: ${JSON.stringify(
                        response?.data,
                    )}`,
                );
            }

            const results: TEtherscanCodeResult[] = response.data.result.map((result: any): TEtherscanCodeResult =>
            {
                if (result.SourceCode === undefined)
                {
                    throw new Error(
                        `Failed to ${lDescription}. Most likely the contract has not been verified on Etherscan.`,
                    );
                }
                // if multiple Solidity source files
                if (result.SourceCode[0] === "{")
                {
                    try
                    {
                        let lParsableResultString: string = result.SourceCode;
                        // This looks like an Etherscan bug but we'll handle it here
                        if (result.SourceCode[1] === "{")
                        {
                            // remove first { and last } from the SourceCode string so it can be JSON parsed
                            lParsableResultString = result.SourceCode.slice(1, -1);
                        }
                        const lRawEtherscanSource: any = JSON.parse(lParsableResultString);
                        // The getsource response from Etherscan is inconsistent so we need to handle both shapes
                        const lSourceFiles: any = lRawEtherscanSource.sources !== undefined
                            ? Object.entries(lRawEtherscanSource.sources)
                            : Object.entries(lRawEtherscanSource);
                        return lSourceFiles.map(
                            ([filename, code]: TParsedEtherscanSource): TEtherscanCodeResult => ({
                                code: code.content,
                                filename,
                            }),
                        );
                    }
                    catch (err)
                    {
                        throw new Error(
                            `Failed to parse Solidity source code from Etherscan's SourceCode. ${result.SourceCode}`,
                        );
                    }
                }
                // if multiple Solidity source files with no Etherscan bug in the SourceCode field
                if (result?.SourceCode?.sources !== undefined)
                {
                    const sourceFiles: any = Object.values(result.SourceCode.sources);
                    return sourceFiles.map(
                        ([filename, code]: [string, { content: string }]): TEtherscanCodeResult => ({
                            code: code.content,
                            filename,
                        }),
                    );
                }
                // Solidity source code was not uploaded into multiple files so is just in the SourceCode field
                return {
                    code: result.SourceCode,
                    filename: aContractAddress,
                };
            });

            return results.flat(1);
        }
        catch (err)
        {
            if (err.message !== undefined)
            {
                throw err;
            }
            if (err.response === undefined)
            {
                throw new Error(`Failed to ${lDescription}. No HTTP response.`);
            }

            throw new Error(
                // eslint-disable-next-line max-len
                `Failed to ${lDescription}. HTTP status code ${err.response?.status}, status text: ${err.response?.statusText}`,
            );
        }
    }

    public async GetFlattenedSourceCode(aAddress: string): Promise<TEtherscanCodeResult>
    {
        const lFiles: TEtherscanCodeResult[] = await this.GetSourceCode(aAddress);

        return {
            filename: lFiles[0].filename,
            code: lFiles
                .map((aResult: TEtherscanCodeResult): string => aResult.code)
                .reduce((aPrev: string, aCurr: string): string => aPrev + aCurr),
        };
    }
}
