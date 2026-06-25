const fs = require('fs');

let code = fs.readFileSync('frontend/src/core/api.ts', 'utf8');

const typeToSchema = {
  'Models.Profile[]': 'z.array(Schemas.ProfileSchema)',
  'Models.Profile': 'Schemas.ProfileSchema',
  'Models.Transaction[]': 'z.array(Schemas.TransactionSchema)',
  'Models.Transaction': 'Schemas.TransactionSchema',
  'Models.Category[]': 'z.array(Schemas.CategorySchema)',
  'Models.Category': 'Schemas.CategorySchema',
  'Models.Account[]': 'z.array(Schemas.AccountSchema)',
  'Models.Account': 'Schemas.AccountSchema',
  'Models.Budget[]': 'z.array(Schemas.BudgetSchema)',
  'Models.Budget': 'Schemas.BudgetSchema',
  'Models.SavingsGoal[]': 'z.array(Schemas.SavingsGoalSchema)',
  'Models.SavingsGoal': 'Schemas.SavingsGoalSchema',
  'Models.Loan[]': 'z.array(Schemas.LoanSchema)',
  'Models.Loan': 'Schemas.LoanSchema',
  'Models.Bill[]': 'z.array(Schemas.BillSchema)',
  'Models.Bill': 'Schemas.BillSchema',
  'Models.Settings': 'Schemas.SettingsSchema',
};

code = code.replace(/this\.request(?:<([^>]+)>)?\(([\s\S]*?)\)/g, (match, typeArg, argsString) => {
  if (typeArg === 'T') return match;
  
  const args = argsString.split(',').map(s => s.trim());
  const urlArg = args[0];
  
  // Check if we already modified it (e.g. 2nd arg is undefined or Schemas.)
  if (args.length >= 2 && (args[1].startsWith('Schemas.') || args[1].startsWith('z.array(Schemas.') || args[1] === 'undefined')) {
    return match;
  }
  
  let schemaArg = 'Schemas.GenericSchema';
  if (typeArg && typeToSchema[typeArg]) {
    schemaArg = typeToSchema[typeArg];
  } else if (!typeArg || typeArg === 'void') {
    schemaArg = 'undefined';
  }
  
  let newArgs = [urlArg, schemaArg];
  
  const commaIndex = argsString.indexOf(',');
  if (commaIndex !== -1) {
    const optionsString = argsString.substring(commaIndex + 1).trim();
    newArgs.push(optionsString);
  }
  
  if (typeArg) {
    return `this.request<${typeArg}>(${newArgs.join(', ')})`;
  } else {
    return `this.request(${newArgs.join(', ')})`;
  }
});

fs.writeFileSync('frontend/src/core/api.ts', code);
console.log('Done!');
