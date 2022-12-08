const args = require("minimist")(process.argv.slice(2), {
  boolean: ["help", "generate", "execute"],
  string: ["mapping", "source", "transformer", "destination"],
});
const generateCodeFile = require("./app");
const path = require("path");
const fs = require("fs");

const printHelp = () => {
  console.log("\t\tJSON TRANSFORMER\t\t");
  console.log("Usage:");
  console.log("node main.js --help\t\t=>\tPrints help");
  console.log(
    "node main.js --generate --mapping MAPPING_SPREADSHEET_PATH --destination TRANSFORMER_DIRECTORY_PATH\t\t=>\tGenerates tranformation code file at the destination directory path."
  );
  console.log(
    "node main.js --execute --source SOURCE_JSON --transformer TRANSFORMATION_CODE --destination TARGET_DIRECTORY_PATH\t\t=>\tGenerates the target JSON file with the specified destination directory path."
  );
};

const createTimeStamp = () => {
  const date = new Date();
  return `${date.getFullYear()}_${date.getMonth()}_${date.getDay()}_${date.getHours()}_${date.getMinutes()}_${date.getSeconds()}_${date.getMilliseconds()}`;
};

const createTarget = (source, transformer, targetDir) => {
  const sourceJSON = require(path.resolve(source));
  const transformJSON = require(path.resolve(transformer));
  const result = transformJSON(sourceJSON);
  fs.writeFileSync(
    path.join(path.resolve(targetDir, `target_${createTimeStamp()}.json`)),
    JSON.stringify(result, null, 2)
  );
};

if (args.help) {
  printHelp();
} else if (args.generate && !args.execute && args.mapping) {
  if (!args.destination) args.destination = path.resolve(".");
  generateCodeFile(args.mapping, args.destination);
} else if (args.execute && !args.generate && args.source && args.transformer) {
  if (!args.destination) args.destination = path.resolve(".");
  createTarget(args.source, args.transformer, args.destination);
} else {
  console.log("Invalid Arguments\n");
  printHelp();
}
