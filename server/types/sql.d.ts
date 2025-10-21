declare module "sql-template-strings" {
  interface SQLStatement {
    text: string;
    values: any[];
    append(statement: SQLStatement | string): SQLStatement;
  }

  function SQL(strings: TemplateStringsArray, ...values: any[]): SQLStatement;

  export = SQL;
}
