/* eslint-disable */
const fs    = require("fs");
const path  = require("path");
const _     = require("lodash");
const gulp  = require("gulp");
const cp    = require("child_process");
const exec  = cp.exec;
const del   = require("del");

const RootFolder  = ".";
const DistFolder  = "./Dist";
const SrcFolder   = "./Src";
const TestFolder  =  `${DistFolder}/Test`;

const _AVA_       = `env ENV__LOGGING_LEVEL=OFF node ${RootFolder}/node_modules/ava/cli.js`;
const _NYC_       = `node ./node_modules/nyc/bin/nyc.js --reporter=lcov --reporter=html --reporter=text-summary`;
const _TSC_       = `${RootFolder}/node_modules/ttypescript/bin/tsc`;
const _ESLINT_    = `node ${RootFolder}/node_modules/eslint/bin/eslint.js`

// ---------------------------------------------------------------------------------------------------------------------
const DistPath = (aPath = "") => { return DistFolder + aPath; }
const RootPath = (aPath = "") => { return RootFolder + aPath; }
const SrcPath = (aPath = "") => { return SrcFolder + aPath; }

const DistDest = (aPath = "") => { return gulp.dest(DistPath(aPath)); }
const Root = (aPath = "") => { return gulp.src(RootPath(aPath)); }
const Src = (aPath = "") => { return gulp.src(SrcPath(aPath)); }

// ---------------------------------------------------------------------------------------------------------------------
gulp.task("clean", done =>
    {
        del([DistPath("**/*")], { force: true });
        done();
    },
);

// ---------------------------------------------------------------------------------------------------------------------
gulp.task("compile", (done) => execTask(_TSC_, done));

// ---------------------------------------------------------------------------------------------------------------------
gulp.task("copy", gulp.parallel(
    () => Root("/tsconfig.json").pipe(DistDest()),

    () => Src("/Config/**/*").pipe(DistDest("/Src/Config")),
    () => Src("/Config/**/.*").pipe(DistDest("/Src/Config")),
));

// ---------------------------------------------------------------------------------------------------------------------
gulp.task("build", gulp.series(
    "clean",
    "compile",
    "copy"
));

// ---------------------------------------------------------------------------------------------------------------------
gulp.task("lint-check", done => execTask(`${_ESLINT_} . --ext .ts`, done));
gulp.task("lint-fix", done => execTask(`${_ESLINT_} . --ext .ts --fix`, done));

// ---------------------------------------------------------------------------------------------------------------------
function getArgs()
{
    let args = {};
    let inProgressArg;

    for (let i = 0; i < process.argv.length; ++i)
    {
        let currentArg = process.argv[i];

        if (currentArg[0] === "-")
        {
            currentArg = currentArg.slice(1);
            if (currentArg[0] === "-")
            {
                currentArg = currentArg.slice(1);
            }

            inProgressArg = currentArg;
        }
        else if (inProgressArg)
        {
            args[inProgressArg] ?? (args[inProgressArg] = []);
            args[inProgressArg].push(currentArg);
            inProgressArg = undefined;
        }
    }

    if (inProgressArg != undefined)
    {
        args[inProgressArg] ?? (args[inProgressArg] = []);
    }

    return args;
}

// ---------------------------------------------------------------------------------------------------------------------
gulp.task("test", done =>
{
    const pathArgs = getArgs()["path"];

    if (pathArgs === undefined)
    {
        execTask(getAvaCommand(TestFolder) + getAvaArgs("match") + getAvaArgs("serial"), done);
    }
    else
    {
        const allDone = _.after(pathArgs.length, done);

        pathArgs.forEach((aPath) =>
        {
            execTask(getAvaCommand(TestFolder + "/" + aPath) + getAvaArgs("match") + getAvaArgs("serial"), allDone);
        });
    }
});

// ---------------------------------------------------------------------------------------------------------------------
gulp.task("coverage", done => execTask(`${_NYC_} ${getAvaCommand(TestFolder)}`, done));

// ---------------------------------------------------------------------------------------------------------------------
gulp.task("start", (done) =>
{
    execTask(`node ${DistFolder}/Src/App.js`, done);
});

// ---------------------------------------------------------------------------------------------------------------------
// Aliases:
gulp.task("tests-all", gulp.task("test"));
gulp.task("build-test", gulp.series(
    "build",
    "tests-all",
));
gulp.task("build-check-test", gulp.series(
    "build",
    "lint-check",
    "tests-all",
));

// Helper functions:
function execTask(command, done)
{
    exec(command, (error, sout, serr) =>
        {
            serr && console.error(serr);
            ProcessExitCode(error);
            done(error);
        }
    ).stdout.pipe(process.stdout);
}

function getAllTestFiles(aDirectory)
{
    const lFiles = [];
    getTestsFromDir(aDirectory);

    function getTestsFromDir(aDirectory)
    {
        const lDirFiles = fs.readdirSync(aDirectory);

        for (const lFileName of lDirFiles)
        {
            const lFilePath = path.join(aDirectory, lFileName);
            if (fs.statSync(lFilePath).isDirectory())
            {
                getTestsFromDir(lFilePath);
            }
            else if (lFileName.includes("test.js"))
            {
                lFiles.push(lFilePath);
            }
        }
    }

    return lFiles;
}

function getAvaCommand(aDirectory)
{
    return _AVA_ +  " " + getAllTestFiles(aDirectory).join(" ");
}

function getAvaArgs(aOption)
{
    const optionArgs = getArgs()[aOption];
    
    let args = "";
    
    if ( optionArgs !== undefined)
    {
        if ( optionArgs.length === 0 )
        {
            return ` --${aOption}`;
        }

        optionArgs.forEach((optionArg) =>
        {
            args += ` --${aOption} '${optionArg}'`;
        });
    }

    return args;
}

const ProcessExitCode = (error = null) =>
{
    if (error)
    {
        console.error(`exec error: ${error}`);
        process.exit(1);
    }
};
