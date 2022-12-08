# JSON Transformation Code Generator

Generates  `NodeJS` code to tranform JSON from one representation to another based on a spreadsheet based mapping specification.

## Use Case

Different systems generate the same data points in different JSON representations. And for one system to consume the data generated by other system, the JSON data needs to be restructured.
This project aims to automate the generation of such restructuring / transformation code.

## Usage

1. Install the dependencies : `npm i`
2. To generate the transformation code from the mapping file : `node main.js --generate --mapping MAPPING_SPREADSHEET_PATH --destination TRANSFORMER_DIRECTORY_PATH`
3. To create the target JSON representation from the generated transformation code in `Step 2` : `node main.js --execute --source SOURCE_JSON --transformer TRANSFORMATION_CODE --destination TARGET_DIRECTORY_PATH`
4. Print help : `node main.js --help`

## Examples

### Simple Restructuring

1. If the source JSON is:

```json
{
    "id": "122-34-6543",
    "firstName": "Leanne",
    "lastName": "Graham",
    "address": {
        "street": "Kulas Light",
        "suite": "Apt. 556",
        "city": "Gwenborough",
        "zipcode": "92998-3874"
    }
}
```

2. The required target JSON is

```json
{
    "CustomerInformation": {
        "SSN": "122-34-6543",
        "LastName": "Graham"
    },
    "CustomerCity": "Gwenborough"
}
```

3. Create a mapping as follows.
   1. Write the target JSON keys in the `Target` column, add `.` based on the level of nesting.
   2. Write the source JSON keys in the `Source` column, start with `.` as the root and add the keys based on the level of nesting.

| Target                       | Source        | Enumeration | Default |
| ---------------------------- | ------------- | ----------- | ------- |
| CustomerInformation.SSN      | .id           |             |         |
| CustomerInformation.LastName | .lastName     |             |         |
| CustomerCity                 | .address.city |             |         |

4. After running the command mentioned in _Usage(step 2)_ the generated code will be:
 
```js
const transformJSON = (source) => {
const final = {};
if (final["CustomerInformation"] == null) {
	final["CustomerInformation"] = {};
}
final["CustomerInformation"]["SSN"] = source["id"]
final["CustomerInformation"]["LastName"] = source["lastName"]
final["CustomerCity"] = source["address"]["city"]
return final
}
module.exports = transformJSON
```

### Using operations in transformation

1. Some basic operations are defined in `functions.js`, if needed add domain specific functions as well here (function names must begin with `$`).
   1. Conditionals have been implemented as the function `$IF`.
   2. Nested operations are supported e.g.`$SUM($MULTIPLY(.data, 100), 20)`

```js
const functions = {
  $ADD: (...args) =>
    args.reduce((prev, next) => Number(prev) + Number(next), 0),
  $MULTIPLY: (...args) => args.reduce((prev, next) => prev * next, 1),
  $SUBTRACT: (...args) => args[0] - args[1],
  $DIVIDE: (...args) => args[0] / args[1],
  $JOIN: (...args) => args.join(""),
  $AVERAGE: (...args) => args.reduce((a, b) => a + b, 0) / args.length,
  $MAX: (...args) => Math.max(...args),
  $MIN: (...args) => Math.min(...args),
  $IF: (condition, thenClause, elseClause) => {
    if (condition) return thenClause
    else return elseClause;
  }
};
```

2. If the source JSON is:


```json
{
    "id": "122-34-6543",
    "firstName": "Leanne",
    "lastName": "Graham",
    "address": {
        "street": "Kulas Light",
        "suite": "Apt. 556",
        "city": "Gwenborough",
        "zipcode": "92998-3874"
    },
    "occupation": "self-employed",
}
```

3. The required target JSON is, `FullName` needs string concatenation

```json
{
    "CustomerInformation": {
        "SSN": "122-34-6543",
        "LastName": "Leanne Graham"
    },
    "CustomerCity": "Gwenborough",
    "CustomerProfession": "SELF"
}
```
4. Create a mapping as follows.
   1. Write the target JSON keys in the `Target` column, add `.` based on the level of nesting.
   2. Write the source JSON keys in the `Source` column, start with `.` as the root and add the keys based on the level of nesting.
   3. Specify the operation defined in `functions.js`

| Target                       | Source                            | Enumeration | Default |
| ---------------------------- | --------------------------------- | ----------- | ------- |
| CustomerInformation.SSN      | .id                               |             |         |
| CustomerInformation.LastName | $JOIN(.firstName, " ", .lastName) |             |         |
| CustomerCity                 | .address.city                     |             |         |

5. After running the command mentioned in _Usage(step 2)_ the generated code will be:


```js
const $JOIN = (...args) => args.join("")
const transformJSON = (source) => {
const final = {};
if (final["CustomerInformation"] == null) {
	final["CustomerInformation"] = {};
}
final["CustomerInformation"]["SSN"] = source["id"]
final["CustomerInformation"]["LastName"] = $JOIN(source["firstName"]," ",source["lastName"])
final["CustomerCity"] = source["address"]["city"]
return final
}
module.exports = transformJSON
```

### Using Enumerations and Default values

1. Use enumerations to map the source value to a pre-defined target value. Specify enumaeration as a valid JSON.

2. If the source value evaluates to `null` or `undefined`, and a default value is specified, then that value will be assigned to the target.

3. If the source JSON is:

```json
{
    "id": "122-34-6543",
    "firstName": "Leanne",
    "lastName": "Graham",
    "address": {
        "street": "Kulas Light",
        "suite": "Apt. 556",
        "city": "Gwenborough",
        "zipcode": "92998-3874"
    },
    "occupation": "self-employed",
}
```

4. The required target JSON is, the `LastName` has a default value, while `CustomerProfession` has an enumeration and a default value.

```json
{
    "CustomerInformation": {
        "SSN": "122-34-6543",
        "LastName": "Leanne Graham"
    },
    "CustomerCity": "Gwenborough",
    "CustomerProfession": "SELF"
}
```

5. Create a mapping as follows.
   1. Write the target JSON keys in the `Target` column, add `.` based on the level of nesting.
   2. Write the source JSON keys in the `Source` column, start with `.` as the root and add the keys based on the level of nesting.
   3. Specify the enumeration JSON and default value.

| Target                       | Source                            | Enumeration                                                            | Default         |
| ---------------------------- | --------------------------------- | ---------------------------------------------------------------------- | --------------- |
| CustomerInformation.SSN      | .id                               |                                                                        |                 |
| CustomerInformation.LastName | $JOIN(.firstName, " ", .lastName) |                                                                        | "John Doe"      |
| CustomerCity                 | .address.city                     |                                                                        |                 |
| CustomerProfession           | $ENUM(.occupation)                | {"self-employed": "SELF", "salaried": "FIXED INCOME", "other": "MISC"} | "NO PROFESSION" |

6. After running the command mentioned in _Usage(step 2)_ the generated code will be:
   
```js
const $JOIN = (...args) => args.join("")

const enum3 = {"self-employed": "SELF", "salaried": "FIXED INCOME", "other": "MISC"}
const transformJSON = (source) => {
const final = {};
if (final["CustomerInformation"] == null) {
	final["CustomerInformation"] = {};
}
final["CustomerInformation"]["SSN"] = source["id"]
final["CustomerInformation"]["LastName"] = $JOIN(source["firstName"]," ",source["lastName"]) != null ? $JOIN(source["firstName"]," ",source["lastName"]) : "John Doe";
final["CustomerCity"] = source["address"]["city"]
final["CustomerProfession"] = enum3[(source["occupation"])] != null ? enum3[(source["occupation"])] : "NO PROFESSION";
return final
}
module.exports = transformJSON
```

## Aggregation from source arrays

1. If the source JSON is,
   
```json
{
    "loans": [
        {
            "year": "2017",
            "amount": 4000
        },
        {
            "year": "2010",
            "amount": 6000
        },
        {
            "year": "2012",
            "amount": 7000
        }
    ]
}
```

2. The target JSON has the sum of all loan amounts,

```json
{
    "CustomerLoanAmount": 17000
}

```

3. To run aggreagate operations on a key from an array of items, specify the operation on the key using `^item` as the placeholder for the array element.
   (Doesn't work with nested arrays)

| Target             | Source                    | Enumeration | Default |
| ------------------ | ------------------------- | ----------- | ------- |
| CustomerLoanAmount | $ADD(.loans.^item.amount) |             |         |

4. After running the command mentioned in _Usage(step 2)_ the generated code will be: 

```js
const $ADD = (...args) =>
    args.reduce((prev, next) => Number(prev) + Number(next), 0)
const transformJSON = (source) => {
const final = {};
final["CustomerLoanAmount"] = $ADD(...(source.loans.map(item => item.amount)))
return final
}
module.exports = transformJSON
```

### Creating Arrays in Target based on Arrays in Source
1. If the source JSON is,

```json
{
    "loans": [
        {
            "year": "2017",
            "amount": 4000
        },
        {
            "year": "2010",
            "amount": 6000
        },
        {
            "year": "2012",
            "amount": 7000
        }
    ]
}
```

2. And the target JSON is,

```json
{
    "CustomerLoans": [
        {
            "LoanYear": "2017",
            "Amount": "4000 USD"
        },
        {
            "LoanYear": "2010",
            "Amount": "6000 USD"
        },
        {
            "LoanYear": "2012",
            "Amount": "7000 USD"
        }
    ]
}
```

3. Here every item in `CustomerLoans` target property is derrived from every items of the `loans` source property. Use `^item` to indicate the item of the array.
   (Doesn't work with nested arrays)

| Target                       | Source                           | Enumeration | Default |
| ---------------------------- | -------------------------------- | ----------- | ------- |
| CustomerLoans.^item.LoanYear | .loans.^item.year                |             |         |
| CustomerLoans.^item.Amount   | $JOIN(.loans.^item.year, " USD") |             |         |

4. After running the command mentioned in _Usage(step 2)_ the generated code will be: 

```js
const $JOIN = (...args) => args.join("")
const transformJSON = (source) => {
const final = {};
final["CustomerLoans"] = []
for(let i = 0; i < source["loans"].length; i++) {
	const item = source["loans"][i]
	const obj = {}
	obj["LoanYear"] = item["year"]
	final["CustomerLoans"].push(obj)
}
for(let i = 0; i < source["loans"].length; i++) {
	const item = source["loans"][i]
	const obj = final["CustomerLoans"][i]
	obj["Amount"] = $JOIN(item.year," USD")
}
return final
}
module.exports = transformJSON
```

## Next Steps

1. Improve the error handling.
2. Use regex capturing groups to identify tokens.
3. Handle nested array scenarios.
4. Create a REST API for `generate` and `execute`.
   