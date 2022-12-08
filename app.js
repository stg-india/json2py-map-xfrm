const fs = require("fs");
const excelToJson = require("convert-excel-to-json");
const sourceJSON = require("./data/sample_1/source.json");
const functions = require("./functions");
const path = require("path");

const functionsString = JSON.stringify(functions, (k, v) => {
  if (typeof v === "function") return v + "";
  else return v;
});

const stringifiedFunctions = JSON.parse(functionsString);

const columnToKey = {
  A: "target",
  B: "source",
  C: "enumeration",
  D: "default",
};

const methodNames = [];
let result = "const transformJSON = (source) => {";
result += "\nconst final = {};";
//////

const convertToSquareBracketNotation = (str) =>
  str
    .split(".")
    .map((item) => item.trim())
    .map((item) => (item[0] === '"' ? `[${item}]` : `["${item}"]`));

const getArguments = (str) => {
  const args = [];
  let argument = "";
  let paranthesisCount = 0;

  for (let i = 0; i < str.length; i++) {
    if (str[i] === "," && paranthesisCount === 0) {
      args.push(argument);
      argument = "";
    } else if (i === str.length - 1) {
      argument += str[i];
      args.push(argument);
      argument = "";
    } else {
      if (str[i] === "(") paranthesisCount += 1;
      if (str[i] === ")") paranthesisCount -= 1;
      argument += str[i];
    }
  }

  return args;
};

const createSourceExpression = (
  sourceName,
  sourceStr,
  targetHasArrays,
  enumName
) => {
  if (sourceStr.trim()[0] !== "." && sourceStr[0].trim() !== "$") {
    return sourceStr;
  }
  if (sourceStr[0].trim() === ".") {
    if (sourceStr.includes("^item") && !targetHasArrays) {
      const splitString = sourceStr
        .split(".^item")
        .filter((item) => item.trim().length);
      if (splitString.length === 2) {
        return `...(${sourceName}${splitString[0]}.map(item => item${splitString[1]}))`;
      }
    } else {
      return `${sourceName}${convertToSquareBracketNotation(
        sourceStr.slice(1)
      ).join("")}`;
    }
  } else {
    let resultString = "";
    let operation = "";
    for (var i = 0; sourceStr[i] !== "("; i++) {
      operation += sourceStr[i];
    }
    methodNames.push(operation);
    if (operation != "$ENUM") {
      resultString += operation;
      resultString += "(";
    } else if (operation == "$ENUM") {
      resultString += enumName;
      resultString += "[(";
    }
    const args = getArguments(sourceStr.slice(i + 1, sourceStr.length - 1));
    for (let i = 0; i < args.length; i++) {
      resultString += createSourceExpression(
        sourceName,
        args[i].trim(),
        targetHasArrays,
        enumName
      );
      if (i !== args.length - 1) {
        resultString += ",";
      }
    }
    if (operation != "$ENUM") {
      return resultString + ")";
    } else {
      return resultString + ")]";
    }
  }
};

const getMainSourceExpression = (str) => {
  if (str[0] === ".") return str;
  const sliceIndexStart = str.indexOf("(");
  const args = getArguments(str.slice(sliceIndexStart + 1, str.length - 1));
  let index = 0;
  while (args[index][0] !== "." && args[index][0] !== "$") index++;
  return getMainSourceExpression(args[index]);
};

const createMethods = (methodNames) => {
  methodNames = [...new Set(methodNames)];
  methodNames = methodNames.filter((method) => method !== "$ENUM");
  methodNames.forEach((method) => {
    const newFunction = `\nconst ${method} = ${stringifiedFunctions[method]}\n`;
    result = newFunction + result;
  });
};

const createTimeStamp = () => {
  const date = new Date();
  return `${date.getFullYear()}_${date.getMonth()}_${date.getDay()}_${date.getHours()}_${date.getMinutes()}_${date.getSeconds()}_${date.getMilliseconds()}`;
};

//////////

const createTransformationCode = (mappingSource) => {
  const jsonSpec = excelToJson({
    sourceFile: mappingSource,
    header: {
      rows: 2,
    },
    sheets: ["Sheet1"],
    columnToKey: columnToKey,
  }).Sheet1;

  jsonSpec.forEach((rule, index) => {
    let hasEnum = false;
    let targetHasArrays = rule.target.includes("^item");
    if (targetHasArrays) {
      const targetSplit = rule.target.split(".^item");
      const targetProp = convertToSquareBracketNotation(targetSplit[0]);
      let appendItems = false;

      let targetString = "final";
      for (var i = 0; i < targetProp.length - 1; i++) {
        const resultStr = `if (${targetString}${targetProp[i]} == null)`;
        if (!result.includes(resultStr)) {
          result += `\nif (${targetString}${targetProp[i]} == null) {\n\t${targetString}${targetProp[i]} = {};\n}`;
        }
        targetString += `${targetProp[i]}`;
      }
      const assignmentStr = `${targetString}${targetProp[i]}`;
      const arrayDeclaration = `${assignmentStr} = []`;
      if (!result.includes(arrayDeclaration)) {
        result += `\n${arrayDeclaration}`;
        appendItems = true;
      }

      const sourceString = getMainSourceExpression(rule.source);
      const sourceSplit = sourceString.split(".^item");
      let sourceValue = sourceSplit[1];
      if (rule.source[0] === "$") {
        sourceValue = rule.source.replaceAll(`${sourceSplit[0]}.^item`, "item");
      }
      result += `\nfor(let i = 0; i < source${convertToSquareBracketNotation(
        sourceSplit[0].slice(1)
      ).join("")}.length; i++) {`;
      if (appendItems === true) {
        result += `\n\tconst item = source${convertToSquareBracketNotation(
          sourceSplit[0].slice(1)
        ).join("")}[i]`;
        result += "\n\tconst obj = {}";
        let itemTargetProp = convertToSquareBracketNotation(
          targetSplit[1].slice(1)
        );
        let targetString = "obj";
        for (var i = 0; i < itemTargetProp.length - 1; i++) {
          result += `\n\tif (${targetString}${itemTargetProp[i]} == null) {\n\t\t${targetString}${itemTargetProp[i]} = {};\n\t}`;
          targetString += `${itemTargetProp[i]}`;
        }
        result += `\n\t${targetString}${
          itemTargetProp[i]
        } = ${createSourceExpression("item", sourceValue, false)}`;
        result += `\n\t${assignmentStr}.push(obj)`;
      } else {
        result += `\n\tconst item = source${convertToSquareBracketNotation(
          sourceSplit[0].slice(1)
        ).join("")}[i]`;
        result += `\n\tconst obj = ${assignmentStr}[i]`;
        let itemTargetProp = convertToSquareBracketNotation(
          targetSplit[1].slice(1)
        );
        let targetString = "obj";
        for (var i = 0; i < itemTargetProp.length - 1; i++) {
          result += `\n\tif (${targetString}${itemTargetProp[i]} == null) {\n\t\t${targetString}${itemTargetProp[i]} = {};\n\t}`;
          targetString += `${itemTargetProp[i]}`;
        }
        result += `\n\t${targetString}${
          itemTargetProp[i]
        } = ${createSourceExpression("item", sourceValue, false)}`;
      }
      result += "\n}";
    } else {
      if (rule.enumeration) {
        result = `\nconst enum${index} = ${rule.enumeration}\n` + result;
        hasEnum = true;
      }
      const targetProp = convertToSquareBracketNotation(rule.target);
      const sourceExpr = hasEnum
        ? createSourceExpression(
            "source",
            rule.source,
            targetHasArrays,
            `enum${index}`
          )
        : createSourceExpression("source", rule.source, targetHasArrays);
      let targetString = "final";
      for (var i = 0; i < targetProp.length - 1; i++) {
        const resultStr = `if (${targetString}${targetProp[i]} == null)`;
        if (!result.includes(resultStr)) {
          result += `\nif (${targetString}${targetProp[i]} == null) {\n\t${targetString}${targetProp[i]} = {};\n}`;
        }
        targetString += `${targetProp[i]}`;
      }
      if (rule.default == null) {
        result += `\n${targetString}${targetProp[i]} = ${createSourceExpression(
          "source",
          rule.source,
          false
        )}`;
      } else {
        result += `\n${targetString}${targetProp[i]} = ${sourceExpr} != null ? ${sourceExpr} : ${rule.default};`;
      }
    }
  });
  createMethods(methodNames);
  result += "\nreturn final\n}";
  result += "\nmodule.exports = transformJSON";
  return result;
};

const generateCodeFile = (mappingSource, destinationDirectory) => {
  const fileContent = createTransformationCode(mappingSource);
  fs.writeFileSync(
    path.join(path.resolve(destinationDirectory), `transformJSON_${createTimeStamp()}.js`),
    fileContent,
    "utf-8"
  );
};

module.exports = generateCodeFile;
