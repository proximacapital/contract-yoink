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
gulp.task("lint", gulp.task("lint-check"));

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
    const lPathArgs = getArgs()["path"];
    const lFileArgs = getArgs()["file"];

    if (lPathArgs !== undefined)
    {
        const allDone = _.after(lPathArgs.length, done);
        lPathArgs.forEach((aPath) =>
        {
            execTask(getAvaCommand(TestFolder + "/" + aPath) + getAvaArgs("match") + getAvaArgs("serial"), allDone);
        });
    }
    else if (lFileArgs !== undefined)
    {
        const lMatchingFiles = getMatchingFiles(lFileArgs, "test");
        if (lMatchingFiles.length === 0)
        {
            done("Could not find any matching test.js files");
            return;
        }

        execTask(_AVA_ +  " " + lMatchingFiles.join(" "), done);
    }
    else
    {
        execTask(getAvaCommand(TestFolder) + getAvaArgs("match") + getAvaArgs("serial"), done);
    }
});

// ---------------------------------------------------------------------------------------------------------------------
gulp.task("demo", done =>
{
    // get file name args
    const lFileArgs = getArgs()["file"];
    if (!lFileArgs || lFileArgs.length <= 0) {
        done("ERROR: Must supply file name list via `--file fileName`");
        return;
    }

    // filter demos to those matching file input
    const lMatchingFiles = getMatchingFiles(lFileArgs, "demo");
    if (lMatchingFiles.length === 0)
    {
        done("Could not find any matching demo.js files");
        return;
    }

    // run demos
    execTask(_AVA_ +  " --fail-fast " + lMatchingFiles.join(" "), done);
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
gulp.task("build-lint-test", gulp.task("build-check-test"));

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

function getMatchingFiles(aFileArgs, aFileType)
{
    // filter files to those matching requested arguments
    const lRegex = new RegExp(`^.*(${aFileArgs.join('|')})\\.${aFileType}\\.js$`);
    const lMatchingFiles = [];
    getAllTestFiles(TestFolder, `.${aFileType}.js`).forEach(aFile =>
    {
        if (lRegex.test(aFile)) { lMatchingFiles.push(aFile); }
    });

    return lMatchingFiles;
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
