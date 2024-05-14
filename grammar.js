module.exports = grammar({
  name: 'plsql',

  extras: $ => [
    /\s\n/,
    /\s/,
    $.comment,
    $.marginalia,
  ],


  conflicts: $ => [
    [$.select_only_statement, $.subquery_basic_elements],
  ],

  word: $ => $._identifier,

  rules: {
    program: $ => seq(
      repeat(
        seq(
          choice(
            $.unit_statement,
          ),
          '/',
        ),
      ),
      // optionally, a single statement without a terminating ;
      optional(
        $.unit_statement,
      ),
    ),

    unit_statement: $ => choice(
      $.create_package_header,
      $.create_package_body,
      $.create_synonym,
      $.data_manipulation_language_statements,
    ),

    sql_statement: $ => choice(
      $.data_manipulation_language_statements,
      //TODO: add more statements
    ),

    data_manipulation_language_statements: $ => choice(
      $.select_statement,
      // TODO: add more DML statements
    ),

    create_package_header: $ => seq(
      $.kCreate,
      optional($._or_replace),
      $.kPackage,
      $.package_name,
      choice($.kIs, $.kAs),
      repeat(
        choice(
          $.pragma_declaration,
          $.variable_declaration,
          $.subtype_declaration,
          $.cursor_declaration,
          $.exception_declaration,
          $.type_declaration,
          $.function_specification,
          $.procedure_specification,
        ),
      ),
      $.kEnd,
      optional($._identifier),
      optional(';')
    ),

    exception_declaration: $ => seq(
      field("name", $.identifier),
      $.kException,
      ';',
    ),

    pragma_declaration: $ => seq(
      $.kPragma,
      choice(
        $.kSeriallyReusable,
        $.kAutonomousTransaction,
        seq($.kExceptionInit, '(',
            field("name", $.identifier),
            ',',
            $._negative_decimal_number,
            ')',
           ),
        seq($.kInline, '(',
            field("name", $.identifier),
            ',',
            choice($.kStrYes, $.kStrNo),
            ')',
           ),
        seq($.kRestrictReferences, '(',
            field("name", $.identifier),
            commaSep1(choice($.kRNDS, $.kWNDS, $.kRNPS, $.kWNPS, $.kTRUST)),
            ')',
           ),
      ),
      ';',
    ),

    record_type_def: $ => seq(
      $.kRecord,
      wrapped_in_parenthesis(commaSep1($.field_spec)),
    ),

    field_spec: $ => seq(
      field("name", $.identifier),
      $.type_spec,
      optional(seq($.kNot, $.kNull)),
      optional($.default_value_part),
    ),

    ref_cursor_type_def: $ => seq(
      $.kRef,
      $.kCursor,
      optional(seq($.kReturn, $.type_spec)),
    ),

    type_declaration: $ => seq(
      $.kType,
      field("name", $.identifier),
      $.kIs,
      choice(
        $.table_type_def,
        $.varray_type_def,
        $.record_type_def,
        $.ref_cursor_type_def,
      ),
      ';',
    ),

    table_type_def: $ => seq(
      $.kTable,
      $.kOf,
      $.type_spec,
      optional($.table_indexed_by_part),
      optional(seq($.kNot, $.kNull)),
    ),

    table_indexed_by_part: $ => seq(
      choice($.kIndexed, $.kIndex),
      $.kBy,
      $.type_spec,
    ),

    varray_type_def: $ => seq(
      choice($.kVarray, seq($.kVarying, $.kArray)),
      wrapped_in_parenthesis($.expression),
      $.kOf,
      $.type_spec,
      optional(seq($.kNot, $.kNull)),
    ),

    seq_of_statements: $ => repeat1(
      choice(
        seq($.statement, ';'),
        $.label_declaration,
      ),
    ),

    label_declaration: $ => seq(
      '<',
      '<',
      field('label_name', $.identifier),
      '>',
      '>',
    ),

    statement: $ => choice(
      $.body,
      $.block,
      $.sql_statement,
      // TODO: add more statements
    ),

    seq_of_declare_specs: $ => repeat1($.declare_spec),

    declare_spec: $ => seq(
      choice(
        $.pragma_declaration,
        $.variable_declaration,
        $.subtype_declaration,
        $.cursor_declaration,
        $.exception_declaration,
        $.type_declaration,
        $.procedure_specification,
        $.function_specification,
        $.procedure_body,
        $.function_body,
      ),
    ),

    variable_declaration: $ => seq(
      $.identifier,
      optional($.kConstant),
      $.type_spec,
      optional(seq($.kNot, $.kNull)),
      optional($.default_value_part),
      ';',
    ),

    subtype_declaration: $ => seq(
      $.kSubType,
      $.identifier,
      $.kIs,
      $.type_spec,
      optional(seq($.kRange, $.expression, '..', $.expression)),
      optional(seq($.kNot, $.kNull)),
      ';',
    ),

    dml_table_expression_clause: $ => choice(
      $.table_collection_expression,
      wrapped_in_parenthesis(seq($.select_statement, optional($.subquery_restriction_clause))),
      seq($.tableview_name, optional($.sample_clause)),
    ),

    table_collection_expression: $ => prec.left(
      seq(
        choice($.kTable, $.kThe),
        choice(wrapped_in_parenthesis($.subquery), wrapped_in_parenthesis($.expression)),
        optional($.outer_join_sign),
      ),
    ),

    subquery_restriction_clause: $ => seq(
      $.kWith,
      choice(
        seq($.kRead, $.kOnly),
        seq($.kCheck, $.kOption, optional(seq($.kConstraint, field("name", $.identifier)))),
      ),
    ),

    sample_clause: $ => seq(
      $.kSample,
      optional($.kBlock),
      wrapped_in_parenthesis(commaSep1($.expression)),
      optional($.seed_part),
    ),

    seed_part: $ => seq(
      $.kSeed,
      wrapped_in_parenthesis($.expression),
    ),

    cursor_declaration: $ => seq(
      $.kCursor,
      field("name", $.identifier),
      optional(wrapped_in_parenthesis(commaSep1($.parameter_spec))),
      $.kIs,
      $.select_statement,
      ';',
    ),

    where_clause: $ => seq(
      $.kWhere,
      choice(
        seq($.kCurrent, $.kOf, $.cursor_name),
        $.expression,
      ),
    ),

    into_clause: $ => seq(
      optional(seq($.kBulk, $.kCollect)),
      $.kInto,
      commaSep1($.variable_name),
    ),


    select_only_statement: $ => seq(
      optional($.subquery_factoring_clause),
      $.subquery,
    ),

    select_statement: $ => seq(
      $.select_only_statement,
      repeat(
        choice(
          $.for_update_clause,
          $.order_by_clause,
          $.offset_clause,
          $.fetch_clause,
        ),
      ),
    ),

    subquery_factoring_clause: $ => seq(
      $.kWith,
      commaSep1($.factoring_element),
    ),

    factoring_element: $ => seq(
      field('name', $.identifier),
      optional($.paren_column_list),
      $.kAs,
      wrapped_in_parenthesis(seq($.subquery, optional($.order_by_clause))),
      optional($.search_clause),
      optional($.cycle_clause),
    ),

    search_clause: $ => seq(
      $.kSearch,
      choice($.kDepth, $.kBreadth),
      $.kFirst,
      $.kBy,
      commaSep1(
        $.column_name,
        optional($.kAsc),
        optional($.kDesc),
        optional(seq($.kNulls, choice($.kFirst, $.kLast))),
      ),
      $.kSet,
      $.column_name,
    ),

    cycle_clause: $ => seq(
      $.kCycle,
      $.column_list,
      $.kSet,
      $.column_name,
      $.kTo,
      $.expression,
      $.kDefault,
      $.expression,
    ),

    subquery: $ => seq(
      $.subquery_basic_elements,
      optional($.subquery_operation_part),
    ),

    subquery_basic_elements: $ => choice(
      $.query_block,
      wrapped_in_parenthesis($.subquery),
    ),

    subquery_operation_part: $ => seq(
      choice(seq($.kUnion, optional($.kAll)), $.kIntersect, $.kMinus),
      $.subquery_basic_elements,
    ),

    query_block: $ => prec.left(
      seq(
        $.kSelect,
        optional(choice($.kDistinct, $.kUnique, $.kAll)),
        $.select_list,
        optional($.into_clause),
        $.from_clause,
        optional($.where_clause),
        optional($.hierarchical_query_clause),
        optional($.group_by_clause),
        optional($.model_clause),
        optional($.order_by_clause),
        optional($.fetch_clause),
      ),
    ),

    select_list: $ => choice(
      "*",
      commaSep1($.select_list_elements),
    ),

    from_clause: $ => seq(
      $.kFrom,
      $.table_ref_list
    ),

    select_list_elements: $ => choice(
      seq($.tableview_name, ".", "*"),
      seq($.expression, optional($.column_alias)),
    ),

    table_ref_list: $ => prec.left(commaSep1($.table_ref)),

    table_ref: $ => prec.left(
      seq(
        $.table_ref_aux,
        optional($.join_clause),
        optional(choice($.pivot_clause, $.unpivot_clause)),
      ),
    ),

    table_ref_aux: $ => prec.left(
      seq(
        $.table_ref_aux_internal,
        optional($.flashback_query_clause),
        optional(field("table_alias", $.identifier)),
      ),
    ),

    table_ref_aux_internal: $ => prec.left(
      choice(
        seq($.dml_table_expression_clause, optional(choice($.pivot_clause, $.unpivot_clause))),
        seq(wrapped_in_parenthesis(seq($.table_ref, optional($.subquery_operation_part)), optional(choice($.pivot_clause, $.unpivot_clause)))),
        seq($.kOnly, wrapped_in_parenthesis($.dml_table_expression_clause)),
      ),
    ),

    join_clause: $ => prec.left(
      seq(
        optional($.query_partition_clause),
        optional(choice($.kCross, $.kNatural)),
        optional(choice($.kInner, $.outer_join_type)),
        $.kJoin,
        $.table_ref_aux,
        optional($.query_partition_clause),
        repeat(choice($.join_on_part, $.join_using_part)),
      ),
    ),

    join_on_part: $ => seq(
      $.kOn,
      $.condition,
    ),

    join_using_part: $ => seq(
      $.kUsing,
      $.paren_column_list,
    ),

    outer_join_type: $ => seq(
      choice($.kLeft, $.kRight, $.kFull),
      optional($.kOuter),
    ),

    query_partition_clause: $ => seq(
      $.kPartition,
      $.kBy,
      choice(
        wrapped_in_parenthesis(choice($.subquery, $.expressions_)),
        $.expressions_
      ),
    ),

    flashback_query_clause: $ => choice(
      seq($.kVersions, $.kBetween, choice($.kScn, $.kTimestamp), $.expression),
      seq($.kAs, $.kOf, choice($.kScn, $.kTimestamp, $.kSnapshot), $.expression),
    ),

    pivot_clause: $ => seq(
      $.kPivot,
      optional($.kXml),
      wrapped_in_parenthesis(seq(commaSep1($.pivot_element), $.pivot_for_clause, $.pivot_in_clause)),
    ),

    pivot_element: $ => seq(
      field("aggregate_function_name", $.identifier),
      wrapped_in_parenthesis($.expression),
      optional($.column_alias),
    ),

    pivot_for_clause: $ => seq(
      $.kFor,
      choice($.column_name, $.paren_column_list),
    ),

    pivot_in_clause: $ => seq(
      $.kIn,
      wrapped_in_parenthesis(
        choice(
          $.subquery,
          commaSep1($.kAny),
          commaSep1($.pivot_in_clause_element),
        ),
      ),
    ),

    pivot_in_clause_element: $ => seq(
      $.pivot_in_clause_elements,
      optional($.column_alias),
    ),

    pivot_in_clause_elements: $ => choice(
      $.expression,
      wrapped_in_parenthesis($.expressions_),
    ),

    unpivot_clause: $ => seq(
      $.kUnpivot,
      optional(seq(choice($.kInclude, $.kExclude), $.kNulls)),
      wrapped_in_parenthesis(seq(choice($.column_name, $.paren_column_list), $.pivot_for_clause, $.unpivot_in_clause)),
    ),

    unpivot_in_clause: $ => seq(
      $.kIn,
      wrapped_in_parenthesis(commaSep1($.unpivot_in_elements)),
    ),

    unpivot_in_elements: $ => seq(
      choice($.column_name, $.paren_column_list),
      optional(
        seq(
          $.kAs,
          choice(
            $.constant,
            wrapped_in_parenthesis(commaSep1($.constant)),
          ),
        ),
      ),
    ),

    hierarchical_query_clause: $ => choice(
      seq($.kConnect, $.kBy, optional($.kNoCycle), $.condition, optional($.start_part)),
      seq($.start_part, $.kConnect, $.kBy, optional($.kNoCycle), $.condition),
    ),

    start_part: $ => seq(
      $.kStart,
      $.kWith,
      $.condition,
    ),

    group_by_clause: $ => prec.left(
      choice(
        seq($.kGroup, $.kBy, commaSep1($.group_by_elements), optional($.having_clause)),
        seq($.having_clause, optional(seq($.kGroup, $.kBy, commaSep1($.group_by_elements)))),
      ),
    ),

    group_by_elements: $ => choice(
      $.grouping_sets_clause,
      $.rollup_cube_clause,
      $.expression,
    ),

    rollup_cube_clause: $ => seq(
      choice($.kRollup, $.kCube),
      wrapped_in_parenthesis(commaSep1($.grouping_sets_elements)),
    ),

    grouping_sets_clause: $ => seq(
      $.kGrouping,
      $.kSets,
      wrapped_in_parenthesis(commaSep1($.grouping_sets_elements)),
    ),

    grouping_sets_elements: $ => choice(
      $.rollup_cube_clause,
      wrapped_in_parenthesis($.expressions_),
      $.expression,
    ),

    having_clause: $ => seq(
      $.kHaving,
      $.condition,
    ),

    model_clause: $ => seq(
      $.kModel,
      repeat($.cell_reference_options),
      optional($.return_rows_clause),
      repeat($.reference_model),
      $.main_model,
    ),

    cell_reference_options: $ => choice(
      seq(choice($.kIgnore, $.kKeep), $.kNav),
      seq($.kUnique, choice($.kDimension, seq($.kSingle, $.kReference))),
    ),

    return_rows_clause: $ => seq(
      $.kReturn,
      choice($.kUpdated, $.kAll),
      $.kRows,
    ),

    reference_model: $ => seq(
      $.kReference,
      field("name", $.identifier),
      $.kOn,
      wrapped_in_parenthesis($.subquery),
      $.model_column_clauses,
      repeat($.cell_reference_options),
    ),

    main_model: $ => seq(
      optional(seq($.kMain, field("name", $.identifier))),
      $.model_column_clauses,
      repeat($.cell_reference_options),
      $.model_rules_clause,
    ),

    model_column_clauses: $ => seq(
      optional($.model_column_partition_part),
      $.kDimension,
      $.kBy,
      $.model_colun_list,
      $.kMeasures,
      $.model_colun_list,
    ),

    model_column_partition_part: $ => seq(
      $.kPartition,
      $.kBy,
      $.model_colun_list,
    ),

    model_colun_list: $ => commaSep1($.model_column),

    model_column: $ => seq(
      choice($.expression, $.query_block),
      optional($.column_alias),
    ),

    model_rules_clause: $ => seq(
      optional($.model_rules_part),
      wrapped_in_parenthesis(optional(commaSep1($.model_rules_element))),
    ),

    model_rules_part: $ => seq(
      $.kRules,
      optional(choice($.kUpdate, seq($.kUpsert, optional($.kAll)))),
      optional(seq(choice($.kAutomatic, $.kSequential), $.kOrder)),
      optional($.model_iterate_clause),
    ),

    model_iterate_clause: $ => seq(
      $.kIterate,
      wrapped_in_parenthesis($.expression),
      optional($.until_part),
    ),

    until_part: $ => seq(
      $.kUntil,
      wrapped_in_parenthesis($.condition),
    ),

    model_rules_element: $ => seq(
      optional(choice($.kUpdate, seq($.kUpsert, optional($.kAll)))),
      $.cell_assignment,
      optional($.order_by_clause),
      '=',
      $.expression,
    ),

    cell_assignment: $ => seq(
      $.model_expression,
    ),

    model_expression: $ => seq(
      $.unary_expression,
      optional(seq('[', $.model_expression_element, ']')),
    ),

    model_expression_element: $ => choice(
      commaSep1(choice($.kAny, $.expression)),
      commaSep1($.single_column_for_loop),
      $.multi_column_for_loop,
    ),

    single_column_for_loop: $ => seq(
      $.kFor,
      $.column_name,
      choice(
        seq($.kIn, wrapped_in_parenthesis(optional($.expressions_))),
        seq(optional(seq($.kLike, $.expression)), $.kFrom, field("from_expr", $.expression), $.kTo, field("to_expr", $.expression)),
      ),
      field("action_expr", $.expression),
    ),

    multi_column_for_loop: $ => seq(
      $.kFor,
      $.paren_column_list,
      $.kIn,
      wrapped_in_parenthesis(choice($.subquery, wrapped_in_parenthesis(optional($.expressions_)))),
    ),

    unary_expression: $ => choice(
      seq(choice('-', '+'), $.unary_expression),
      //TODO: add more unary expressions
    ),

    until_part: $ => seq(
      $.kUntil,
      wrapped_in_parenthesis($.condition),
    ),

    order_by_clause: $ => prec.left(
      seq(
        $.kOrder,
        optional($.kSiblings),
        $.kBy,
        commaSep1($.order_by_elements),
      ),
    ),

    order_by_elements: $ => seq(
      $.expression,
      optional(choice($.kAsc, $.kDesc)),
      optional(seq($.kNulls, choice($.kFirst, $.kLast))),
    ),

    offset_clause: $ => seq(
      $.kOffset,
      $.expression,
      choice($.kRow, $.kRows),
    ),

    fetch_clause: $ => seq(
      $.kFetch,
      choice($.kFirst, $.kNext),
      seq($.expression, optional($.kPercent)),
      choice($.kRow, $.kRows),
      choice($.kOnly, $.kWith, $.kTies),
    ),

    for_update_clause: $ => seq(
      $.kFor,
      $.kUpdate,
      optional($.for_update_of_part),
      optional($.for_update_options),
    ),

    for_update_of_part: $ => seq(
      $.kOf,
      $.column_list,
    ),

    for_update_options: $ => choice(
      seq($.kSkip, $.kLocked),
      seq($.kWait, $.expression),
      $.kNowait,
    ),

    column_alias: $ => choice(
      $.kAs,
      seq(optional($.kAs), $.identifier),
    ),

    condition: $ => seq(
      $.expression,
    ),

    expressions_: $ => prec.left(commaSep1($.expression)),

    paren_column_list: $ => wrapped_in_parenthesis($.column_list),

    column_list: $ => commaSep1($.column_name),
    column_name: $ => field('name', $.identifier),

    invoker_rights_clause: $ => seq(
      $.kAuthId,
      choice($.kCurrentUser, $.kDefiner),
    ),

    call_spec: $ => seq(
      $.kLanguage,
      choice($.java_spec, $.c_spec),
    ),

    java_spec: $ => seq(
      $.kJava,
      $.kName,
      field('name', $._single_quote_string),
    ),

    c_spec: $ => seq(
      $.kC,
      optional(seq($.kName, field('name', $._single_quote_string))),
      $.kLibrary,
      $.identifier,
      optional($.c_agent_in_clause),
      optional(seq($.kWith, $.kContext)),
      optional($.c_parameters_clause),
    ),

    c_agent_in_clause: $ => seq(
      $.kAgent,
      $.kIn,
      wrapped_in_parenthesis($.expressions_),
    ),

    c_parameters_clause: $ => seq(
      $.kParameter,
      wrapped_in_parenthesis(choice($.expressions_, '...')),
    ),

    parameter_spec: $ => seq(
      field('name', $.identifier),
      optional(seq(optional($.kIn), $.type_spec)),
      optional($.default_value_part),
    ),

    default_value_part: $ => seq(
      choice($.kDefault, ":="),
      $.expression,
    ),

    function_specification: $ => seq(
      $.kFunction,
      field('name', $.identifier),
      optional($.parameter_list),
      $.return_type,
      optional($.kPipelined),
      optional($.kDeterministic),
      optional($.kResultCache),
      ';',
    ),

    keep_clause: $ => seq(
      $.kKeep,
      wrapped_in_parenthesis(
        seq(
          $.kDenseRank,
          choice($.kFirst, $.kLast),
          $.order_by_clause,
        ),
      ),
      optional($.over_clause),
    ),

    over_clause: $ => seq(
      $.kOver,
      wrapped_in_parenthesis(
        seq(
          optional($.query_partition_clause),
          optional(seq($.order_by_clause, optional($.windowing_clause))),
        ),
      ),
    ),

    windowing_clause: $ => seq(
      choice($.kRows, $.kRange),
      choice(
        seq(
          $.kBetween,
          $.windowing_elements,
          $.kAnd,
          $.windowing_elements,
        ),
        $.windowing_elements,
      ),
    ),

    windowing_elements: $ => choice(
      seq($.kUnbounded, $.kPreceding),
      seq($.kCurrent, $.kRow),
      seq($.concatenation, $.kPreceding),
      seq($.concatenation, $.kFollowing),
    ),

    function_argument: $ => prec.left(
      seq(
        wrapped_in_parenthesis(commaSep1($.argument)),
        optional($.keep_clause),
      ),
    ),

    argument: $ => seq(
      optional(
        seq(
          field('name', $.identifier),
          '=',
          '>',
        ),
      ),
      $.expression,
    ),

    procedure_specification: $ => seq(
      $.kProcedure,
      field('name', $.identifier),
      optional($.parameter_list),
      ';',
    ),

    constant: $ => choice(
      $.kNull,
      $.kDefault,
      $.kTrue,
      $.kFalse,
      //TODO: add more constants
    ),

    variable_name: $ => choice(
      seq(optional(seq($.kIntroducer, field("char_set_name", $.identifier))), $.identifier),
      $.bind_variable,
    ),

    cursor_name: $ => choice(
      $.general_element,
      $.bind_variable,
    ),

    tableview_name: $ => prec.left(
      choice(
        seq(
          $.identifier,
          optional(seq('@', field("link_name", $.identifier), optional(seq('.', field("link_name", $.identifier))))),
        ),
        seq($.xmltable, optional($.outer_join_sign)),
      ),
    ),

    xmltable: $ => prec.left(
      seq(
        $.kXmlTable,
        wrapped_in_parenthesis(seq(
          optional(seq($.xml_namespace_clause, ',')),
          $.concatenation,
          optional($.xml_passing_clause),
          optional(seq($.kColumns, commaSep1($.xml_table_column))),
        )),
        optional(seq('.', $.general_element_part)),
      ),
    ),

    xml_passing_clause: $ => seq(
      $.kPassing,
      optional(seq($.kBy, $.kValue)),
      commaSep1(seq($.expression, optional($.column_alias))),
    ),

    xml_table_column: $ => seq(
      field('name', $.identifier),
      choice(
        seq($.kFor, $.kOrdinality),
        seq($.type_spec, optional(seq($.kPath, $.concatenation)))
      ),
      optional($.xml_general_default_part),
    ),

    xml_general_default_part: $ => seq(
      $.kDefault,
      $.concatenation,
    ),


    xml_namespace_clause: $ => seq(
      $.kXmlNamespaces,
      wrapped_in_parenthesis(seq(commaSep1(seq($.concatenation, $.column_alias)), optional($.xml_general_default_part))),
    ),

    xml_general_default_part: $ => seq(
      $.kDefault,
      $.concatenation,
    ),

    concatenation: $ => prec.left(
      choice(
        seq($.concatenation, '||', $.concatenation),
        //TODO: add more concatenation types
      ),
    ),

    parameter_list: $ => seq(
      '(',
      repeat(
        seq(
          $.parameter,
          ',',
        ),
      ),
      $.parameter,
      ')',
    ),

    parameter: $ => seq(
      field('name', $.identifier),
      optional(
        choice(
          $.kIn,
          $.kOut,
          $.kInOut,
          $.kNoCopy,
        ),
      ),
      $.type_spec,
      optional($.default_value_part),
    ),

    return_type: $ => seq(
      $.kReturn,
      $.type_spec,
    ),

    type_spec: $ => choice(
      $.datatype,
      seq(
        optional($.kRef),
        sep1($.identifier, '.'),
        optional(seq('%', choice($.kType, $.kRowType)))
      ),
    ),

    datatype: $ => choice(
      seq(
        $.native_datatype_element,
        optional($.precision_part),
        optional(
          choice(
            seq(
              $.kWith,
              optional($.kLocal),
              $.kTime,
              $.kZone,
            ),
            seq(
              $.kCharacter,
              $.kSet,
              field('char_set_name', $.identifier),
            ),
          ),
        ),
      ),
      seq(
        $.kInterval,
        choice($.kYear, $.kDay),
        optional(wrapped_in_parenthesis($.expression)),
        $.kTo,
        choice($.kMonth, $.kSecond),
        optional(wrapped_in_parenthesis($.expression)),
      ),
    ),

    precision_part: $ => seq(
      '(',
      choice($._natural_number, '*'),
      optional(seq(',', choice($._natural_number, '*'))),
      optional(choice($.kChar, $.kByte)),
      ')',
    ),

    native_datatype_element: $ => choice(
      $.kBinaryInteger,
      $.kNatural,
      $.kBinaryFloat,
      $.kBinaryDouble,
      $.kNaturaln,
      $.kPositive,
      $.kPositiven,
      $.kSigntype,
      $.kSimpleInteger,
      $.kNvarchar2,
      $.kDec,
      $.kInteger,
      $.kInt,
      $.kNumeric,
      $.kSmallint,
      $.kNumber,
      $.kDecimal,
      seq($.kDouble, optional($.kPrecision)),
      $.kFloat,
      $.kReal,
      $.kNchar,
      seq($.kLong, optional($.kRaw)),
      $.kChar,
      $.kCharacter,
      $.kVarchar2,
      $.kVarchar,
      $.kString,
      $.kRaw,
      $.kBoolean,
      $.kDate,
      $.kRowid,
      $.kUrowid,
      $.kYear,
      $.kMonth,
      $.kDay,
      $.kHour,
      $.kMinute,
      $.kSecond,
      $.kTimezoneHour,
      $.kTimezoneMinute,
      $.kTimezoneRegion,
      $.kTimezoneAbbr,
      $.kTimestamp,
      $.kTimestampUnconstrained,
      $.kTimestampTzUnconstrained,
      $.kTimestampLtzUnconstrained,
      $.kYmintervalUnconstrained,
      $.kDsintervalUnconstrained,
      $.kBfile,
      $.kBlob,
      $.kClob,
      $.kNclob,
      $.kMlslabel,
      $.kXmltype,
    ),

    bind_variable: $ => seq(
      ':',
      $.identifier,
      //TODO: check if this is correct
    ),

    general_element: $ =>  sep1($.general_element_part, '.'),

    general_element_part: $ => prec.left(
      seq(
        optional(seq($.kIntroducer, field("char_set_name", $.identifier))),
        $.identifier,
        optional(seq('@', field("link_name", $.identifier))),
        optional($.function_argument),
      ),
    ),

    // TODO: add more expressions
    expression: $ => choice(
      $.literal,
    ),

    row_type: $ => seq(
      optional(seq(field('schema', $.identifier), '.')),
      field('table', $.identifier),
      '.',
      field('column', $.identifier),
      '%',
      $.kType,
    ),

    create_package_body: $ => seq(
      $.kCreate,
      optional($._or_replace),
      $.kPackage,
      $.kBody,
      $.package_name,
      choice($.kIs, $.kAs),
      repeat(
        choice(
          $.variable_declaration,
          $.subtype_declaration,
          $.cursor_declaration,
          $.exception_declaration,
          $.type_declaration,
          $.function_specification,
          $.procedure_specification,
          $.procedure_body,
          $.function_body,
        ),
      ),
      $.kEnd,
      optional($._identifier),
      optional(';')
    ),

    function_body: $ => seq(
      $.kFunction,
      field('name', $.identifier),
      optional($.parameter_list),
      $.return_type,
      // TODO: solve this conflict
      // repeat(
      //   choice(
      //     $.invoker_rights_clause,
      //     $.parallel_enable_clause,
      //     $.result_cache_clause,
      //     $.kDeterministic,
      //   ),
      // ),
      choice(
        seq(
          optional($.kPipelined),
          optional($.kDeterministic),
          choice(
            $.kIs,
            $.kAs,
          ),
          choice(
            seq(
              optional($.kDeclare),
              optional($.seq_of_declare_specs),
              $.body,
            ),
            $.call_spec,
          ),
        ),
        seq(
          choice($.kPipelined, $.kAggregate),
          $.kUsing,
          field('name', $.identifier),
        ),
      ),
      ';',
    ),

    procedure_body: $ => seq(
      $.kProcedure,
      field('name', $.identifier),
      optional($.parameter_list),
      choice($.kIs, $.kAs),
      choice(
        seq(
          optional($.kDeclare),
          optional($.seq_of_declare_specs),
          $.body,
        ),
        $.call_spec,
        $.kExternal,
      ),
      ';',
    ),

    body: $ => seq(
      $.kBegin,
      $.seq_of_statements,
      optional(seq($.kException, repeat1($.exception_handler))),
      $.kEnd,
      optional(field('label_name', $.identifier)),
    ),

    block: $ => seq(
      optional($.kDeclare),
      repeat1($.declare_spec),
      $.body,
    ),

    exception_handler: $ => seq(
      $.kWhen,
      field('name', $.identifier),
      repeat(seq($.kOr, field('name', $.identifier))),
      $.kThen,
      $.seq_of_statements,
    ),

    create_synonym: $ => seq(
      $.kCreate,
      optional($._or_replace),
      $.kSynonym,
      $.identifier,
      $.kFor,
      $.synonym_target,
      optional(';')
    ),

    parallel_enable_clause: $ => seq(
      $.kParallelEnable,
      optional($.partition_by_clause),
    ),

    partition_by_clause: $ => wrapped_in_parenthesis(
      seq(
        $.kPartition,
        $.expression,
        $.kBy,
        choice(
          $.kAny,
          seq(
            choice($.kHash, $.kRange, $.kList),
            $.paren_column_list,
          ),
        ),
        optional($.streaming_clause),
      ),
    ),

    result_cache_clause: $ => seq(
      $.kResultCache,
      optional($.relies_on_part),
    ),

    relies_on_part: $ => seq(
      $.kReliesOn,
      wrapped_in_parenthesis(commaSep1($.identifier)),
    ),

    streaming_clause: $ => seq(
      choice($.kOrder, $.kCluser),
      $.expression,
      $.kBy,
      $.paren_column_list,
    ),

    synonym_target: $ => seq(
      optional(seq(field('schema', $.identifier), '.')),
      $.identifier,
    ),

    package_name: $ =>
    seq(
      optional(seq(field('schema', $.identifier), '.')),
      $.identifier,
    ),

    _or_replace: $ => seq($.kOr, $.kReplace),

    kAccessible: _ => make_keyword("ACCESSIBLE"),
    kAgent: _ => make_keyword("AGENT"),
    kAggregate: _ => make_keyword("AGGREGATE"),
    kAll: _ => make_keyword("ALL"),
    kAnd: _ => make_keyword("AND"),
    kAny: _ => make_keyword("ANY"),
    kApply: _ => make_keyword("APPLY"),
    kArray: _ => make_keyword("ARRAY"),
    kAs: _ => make_keyword("AS"),
    kAsc: _ => make_keyword("ASC"),
    kAt: _ => make_keyword("AT"),
    kAuthId: _ => make_keyword("AUTHID"),
    kAuthid: _ => make_keyword("AUTHID"),
    kAutomatic: _ => make_keyword("AUTOMATIC"),
    kAutonomousTransaction: _ => make_keyword("AUTONOMOUS_TRANSACTION"),
    kAvg: _ => make_keyword("AVG"),
    kBegin: _ => make_keyword("BEGIN"),
    kBetween: _ => make_keyword("BETWEEN"),
    kBfile: _ => make_keyword("BFILE"),
    kBinaryDouble: _ => make_keyword("BINARY_DOUBLE"),
    kBinaryFloat: _ => make_keyword("BINARY_FLOAT"),
    kBinaryInteger: _ => make_keyword("BINARY_INTEGER"),
    kBlob: _ => make_keyword("BLOB"),
    kBlock: _ => make_keyword("BLOCK"),
    kBody: _ => make_keyword("BODY"),
    kBoolean: _ => make_keyword("BOOLEAN"),
    kBoth: _ => make_keyword("BOTH"),
    kBreadth: _ => make_keyword("BREADTH"),
    kBulk: _ => make_keyword("BULK"),
    kBy: _ => make_keyword("BY"),
    kByte: _ => make_keyword("BYTE"),
    kC: _ => make_keyword("C"),
    kChar: _ => make_keyword("CHAR"),
    kCharacter: _ => make_keyword("CHARACTER"),
    kCheck: _ => make_keyword("CHECK"),
    kChr: _ => make_keyword("CHR"),
    kClob: _ => make_keyword("CLOB"),
    kCluser: _ => make_keyword("CLUSTER"),
    kCollect: _ => make_keyword("COLLECT"),
    kColumns: _ => make_keyword("COLUMNS"),
    kConnect: _ => make_keyword("CONNECT"),
    kConnectByRoot: _ => make_keyword("CONNECT_BY_ROOT"),
    kConstant: _ => make_keyword("CONSTANT"),
    kConstraint: _ => make_keyword("CONSTRAINT"),
    kContext: _ => make_keyword("CONTEXT"),
    kCorr: _ => make_keyword("CORR"),
    kCount: _ => make_keyword("COUNT"),
    kCovar: _ => make_keyword("COVAR_"),
    kCreate: _ => make_keyword("CREATE"),
    kCross: _ => make_keyword("CROSS"),
    kCube: _ => make_keyword("CUBE"),
    kCurrent: _ => make_keyword("CURRENT"),
    kCurrentUser: _ => make_keyword("CURRENT_USER"),
    kCursor: _ => make_keyword("CURSOR"),
    kCycle: _ => make_keyword("CYCLE"),
    kD: _ => make_keyword("D"),
    kDate: _ => make_keyword("DATE"),
    kDay: _ => make_keyword("DAY"),
    kDec: _ => make_keyword("DEC"),
    kDecimal: _ => make_keyword("DECIMAL"),
    kDeclare: _ => make_keyword("DECLARE"),
    kDecode: _ => make_keyword("DECODE"),
    kDecrement: _ => make_keyword("DECREMENT"),
    kDefault: _ => make_keyword("DEFAULT"),
    kDefiner: _ => make_keyword("DEFINER"),
    kDenseRank: _ => make_keyword("DENSE_RANK"),
    kDepth: _ => make_keyword("DEPTH"),
    kDesc: _ => make_keyword("DESC"),
    kDeterministic: _ => make_keyword("DETERMINISTIC"),
    kDimension: _ => make_keyword("DIMENSION"),
    kDistinct: _ => make_keyword("DISTINCT"),
    kDouble: _ => make_keyword("DOUBLE"),
    kDsintervalUnconstrained: _ => make_keyword("DSINTERVAL_UNCONSTRAINED"),
    kEditionable: _ => make_keyword("EDITIONABLE"),
    kEmpty: _ => make_keyword("EMPTY"),
    kEnd: _ => make_keyword("END"),
    kEntityescaping: _ => make_keyword("ENTITYESCAPING"),
    kError: _ => make_keyword("ERROR"),
    kEscape: _ => make_keyword("ESCAPE"),
    kEvalname: _ => make_keyword("EVALNAME"),
    kException: _ => make_keyword("EXCEPTION"),
    kExceptionInit: _ => make_keyword("EXCEPTION_INIT"),
    kExclude: _ => make_keyword("EXCLUDE"),
    kExists: _ => make_keyword("EXISTS"),
    kExternal: _ => make_keyword("EXTERNAL"),
    kF: _ => make_keyword("F"),
    kFalse: _ => make_keyword("FALSE"),
    kFetch: _ => make_keyword("FETCH"),
    kFirst: _ => make_keyword("FIRST"),
    kFloat: _ => make_keyword("FLOAT"),
    kFollowing: _ => make_keyword("FOLLOWING"),
    kFor: _ => make_keyword("FOR"),
    kFrom: _ => make_keyword("FROM"),
    kFull: _ => make_keyword("FULL"),
    kFunction: _ => make_keyword("FUNCTION"),
    kGreatest: _ => make_keyword("GREATEST"),
    kGroup: _ => make_keyword("GROUP"),
    kGrouping: _ => make_keyword("GROUPING"),
    kHash: _ => make_keyword("HASH"),
    kHaving: _ => make_keyword("HAVING"),
    kHour: _ => make_keyword("HOUR"),
    kIdentified: _ => make_keyword("IDENTIFIED"),
    kIgnore: _ => make_keyword("IGNORE"),
    kIn: _ => make_keyword("IN"),
    kInOut: _ => make_keyword("IN OUT"),
    kInclude: _ => make_keyword("INCLUDE"),
    kIncrement: _ => make_keyword("INCREMENT"),
    kIndex: _ => make_keyword("INDEX"),
    kIndexed: _ => make_keyword("INDEXED"),
    kIndicator: _ => make_keyword("INDICATOR"),
    kInfinite: _ => make_keyword("INFINITE"),
    kInline: _ => make_keyword("INLINE"),
    kInner: _ => make_keyword("INNER"),
    kInt: _ => make_keyword("INT"),
    kInteger: _ => make_keyword("INTEGER"),
    kIntersect: _ => make_keyword("INTERSECT"),
    kInterval: _ => make_keyword("INTERVAL"),
    kInto: _ => make_keyword("INTO"),
    kIntroducer: _ => make_keyword("INTRODUCER"),
    kIs: _ => make_keyword("IS"),
    kIterate: _ => make_keyword("ITERATE"),
    kJava: _ => make_keyword("JAVA"),
    kJoin: _ => make_keyword("JOIN"),
    kKeep: _ => make_keyword("KEEP"),
    kLag: _ => make_keyword("LAG"),
    kLanguage: _ => make_keyword("LANGUAGE"),
    kLast: _ => make_keyword("LAST"),
    kLead: _ => make_keyword("LEAD"),
    kLeading: _ => make_keyword("LEADING"),
    kLeast: _ => make_keyword("LEAST"),
    kLeft: _ => make_keyword("LEFT"),
    kLibrary: _ => make_keyword("LIBRARY"),
    kLike2: _ => make_keyword("LIKE2"),
    kLike4: _ => make_keyword("LIKE4"),
    kLike: _ => make_keyword("LIKE"),
    kLikec: _ => make_keyword("LIKEC"),
    kList: _ => make_keyword("LIST"),
    kLocal: _ => make_keyword("LOCAL"),
    kLocked: _ => make_keyword("LOCKED"),
    kLong: _ => make_keyword("LONG"),
    kMain: _ => make_keyword("MAIN"),
    kMax: _ => make_keyword("MAX"),
    kMaxvalue: _ => make_keyword("MAXVALUE"),
    kMeasures: _ => make_keyword("MEASURES"),
    kMedian: _ => make_keyword("MEDIAN"),
    kMember: _ => make_keyword("MEMBER"),
    kMin: _ => make_keyword("MIN"),
    kMinus: _ => make_keyword("MINUS"),
    kMinute: _ => make_keyword("MINUTE"),
    kMlslabel: _ => make_keyword("MLSLABEL"),
    kModel: _ => make_keyword("MODEL"),
    kMonth: _ => make_keyword("MONTH"),
    kName: _ => make_keyword("NAME"),
    kNan: _ => make_keyword("NAN"),
    kNatural: _ => make_keyword("NATURAL"),
    kNaturaln: _ => make_keyword("NATURALN"),
    kNav: _ => make_keyword("NAV"),
    kNchar: _ => make_keyword("NCHAR"),
    kNcharCs: _ => make_keyword("NCHAR_CS"),
    kNclob: _ => make_keyword("NCLOB"),
    kNext: _ => make_keyword("NEXT"),
    kNo: _ => make_keyword("NO"),
    kNoCopy: _ => make_keyword("NOCOPY"),
    kNoCycle: _ => make_keyword("NOCYCLE"),
    kNocicle: _ => make_keyword("NOCICLE"),
    kNocopy: _ => make_keyword("NOCOPY"),
    kNoentityescaping: _ => make_keyword("NOENTITYESCAPING"),
    kNoneditionable: _ => make_keyword("NONEDITIONABLE"),
    kNoschemacheck: _ => make_keyword("NOSCHEMACHECK"),
    kNot: _ => make_keyword("NOT"),
    kNowait: _ => make_keyword("NOWAIT") ,
    kNowait: _ => make_keyword("NOWAIT"),
    kNtile: _ => make_keyword("NTILE"),
    kNull: _ => make_keyword("NULL"),
    kNulls: _ => make_keyword("NULLS"),
    kNumber: _ => make_keyword("NUMBER"),
    kNumeric: _ => make_keyword("NUMERIC"),
    kNvarchar2: _ => make_keyword("NVARCHAR2"),
    kNvl: _ => make_keyword("NVL"),
    kOf: _ => make_keyword("OF"),
    kOffset: _ => make_keyword("OFFSET"),
    kOn: _ => make_keyword("ON"),
    kOnly: _ => make_keyword("ONLY"),
    kOption: _ => make_keyword("OPTION"),
    kOr: _ => make_keyword("OR"),
    kOrder: _ => make_keyword("ORDER"),
    kOrdinality: _ => make_keyword("ORDINALITY"),
    kOut: _ => make_keyword("OUT"),
    kOuter: _ => make_keyword("OUTER"),
    kOver: _ => make_keyword("OVER"),
    kOverflow: _ => make_keyword("OVERFLOW"),
    kPackage: _ => make_keyword("PACKAGE"),
    kParallelEnable: _ => make_keyword("PARALLEL_ENABLE"),
    kParameter: _ => make_keyword("PARAMETER"),
    kPartition: _ => make_keyword("PARTITION"),
    kPassing: _ => make_keyword("PASSING"),
    kPath: _ => make_keyword("PATH"),
    kPerRowType: _ => make_keyword("%ROWTYPE"),
    kPerType: _ => make_keyword("%TYPE"),
    kPercent: _ => make_keyword("PERCENT"),
    kPipelined: _ => make_keyword("PIPELINED"),
    kPivot: _ => make_keyword("PIVOT"),
    kPositive: _ => make_keyword("POSITIVE"),
    kPositiven: _ => make_keyword("POSITIVEN"),
    kPragma: _ => make_keyword("PRAGMA"),
    kPreceding: _ => make_keyword("PRECEDING"),
    kPrecision: _ => make_keyword("PRECISION"),
    kPresent: _ => make_keyword("PRESENT"),
    kPrior: _ => make_keyword("PRIOR"),
    kProcedure: _ => make_keyword("PROCEDURE"),
    kRNDS: _ => make_keyword("RNDS"),
    kRNPS: _ => make_keyword("RNPS"),
    kRange: _ => make_keyword("RANGE"),
    kRatioToReport: _ => make_keyword("RATIO_TO_REPORT"),
    kRaw: _ => make_keyword("RAW"),
    kRead: _ => make_keyword("READ"),
    kReal: _ => make_keyword("REAL"),
    kRecord: _ => make_keyword("RECORD"),
    kRef: _ => make_keyword("REF"),
    kReference: _ => make_keyword("REFERENCE"),
    kRegr: _ => make_keyword("REGR_"),
    kReliesOn: _ => make_keyword("RELIES_ON"),
    kReplace: _ => make_keyword("REPLACE"),
    kRespect: _ => make_keyword("RESPECT"),
    kRestrictReferences: _ => make_keyword("RESTRICT_REFERENCES"),
    kResultCache: _ => make_keyword("RESULT_CACHE"),
    kReturn: _ => make_keyword("RETURN"),
    kRight: _ => make_keyword("RIGHT"),
    kRollup: _ => make_keyword("ROLLUP"),
    kRound: _ => make_keyword("ROUND"),
    kRow: _ => make_keyword("ROW"),
    kRowNumber: _ => make_keyword("ROW_NUMBER"),
    kRowType: _ => make_keyword("ROWTYPE"),
    kRowid: _ => make_keyword("ROWID"),
    kRows: _ => make_keyword("ROWS"),
    kRules: _ => make_keyword("RULES"),
    kSample: _ => make_keyword("SAMPLE"),
    kSchemacheck: _ => make_keyword("SCHEMACHECK"),
    kScn: _ => make_keyword("SCN"),
    kSearch: _ => make_keyword("SEARCH"),
    kSecond: _ => make_keyword("SECOND"),
    kSeed: _ => make_keyword("SEED"),
    kSelect: _ => make_keyword("SELECT"),
    kSequential: _ => make_keyword("SEQUENTIAL"),
    kSeriallyReusable: _ => make_keyword("SERIALLY_REUSABLE"),
    kSet: _ => make_keyword("SET"),
    kSets: _ => make_keyword("SETS"),
    kSiblings: _ => make_keyword("SIBLINGS"),
    kSigntype: _ => make_keyword("SIGNTYPE"),
    kSimpleInteger: _ => make_keyword("SIMPLE_INTEGER"),
    kSingle: _ => make_keyword("SINGLE"),
    kSkip: _ => make_keyword("SKIP"),
    kSmallint: _ => make_keyword("SMALLINT"),
    kSnapshot: _ => make_keyword("SNAPSHOT"),
    kSome: _ => make_keyword("SOME"),
    kStart: _ => make_keyword("START"),
    kStddev: _ => make_keyword("STDDEV"),
    kStrNo: _ => make_keyword("'NO'"),
    kStrYes: _ => make_keyword("'YES'"),
    kString: _ => make_keyword("STRING"),
    kSubType: _ => make_keyword("SUBTYPE"),
    kSubmultiset: _ => make_keyword("SUBMULTISET"),
    kSubpartition: _ => make_keyword("SUBPARTITION"),
    kSubstr: _ => make_keyword("SUBSTR"),
    kSum: _ => make_keyword("SUM"),
    kSynonym: _ => make_keyword("SYNONYM"),
    kTRUST: _ => make_keyword("TRUST"),
    kTable: _ => make_keyword("TABLE"),
    kThe: _ => make_keyword("THE"),
    kThen: _ => make_keyword("THEN"),
    kTies: _ => make_keyword("TIES"),
    kTime: _ => make_keyword("TIME"),
    kTimestamp: _ => make_keyword("TIMESTAMP"),
    kTimestampLtzUnconstrained: _ => make_keyword("TIMESTAMP_LTZ_UNCONSTRAINED"),
    kTimestampTzUnconstrained: _ => make_keyword("TIMESTAMP_TZ_UNCONSTRAINED"),
    kTimestampUnconstrained: _ => make_keyword("TIMESTAMP_UNCONSTRAINED"),
    kTimezoneAbbr: _ => make_keyword("TIMEZONE_ABBR"),
    kTimezoneHour: _ => make_keyword("TIMEZONE_HOUR"),
    kTimezoneMinute: _ => make_keyword("TIMEZONE_MINUTE"),
    kTimezoneRegion: _ => make_keyword("TIMEZONE_REGION"),
    kTo: _ => make_keyword("TO"),
    kToChar: _ => make_keyword("TO_CHAR"),
    kToDate: _ => make_keyword("TO_DATE"),
    kTrailing: _ => make_keyword("TRAILING"),
    kTrigger: _ => make_keyword("TRIGGER"),
    kTrim: _ => make_keyword("TRIM"),
    kTrue: _ => make_keyword("TRUE"),
    kTruncate: _ => make_keyword("TRUNCATE"),
    kType: _ => make_keyword("TYPE"),
    kUnbounded: _ => make_keyword("UNBOUNDED"),
    kUnderscore: _ => make_keyword("_"),
    kUnion: _ => make_keyword("UNION"),
    kUnique: _ => make_keyword("UNIQUE"),
    kUnpivot: _ => make_keyword("UNPIVOT"),
    kUntil: _ => make_keyword("UNTIL"),
    kUpdate: _ => make_keyword("UPDATE"),
    kUpdated: _ => make_keyword("UPDATED"),
    kUpsert: _ => make_keyword("UPSERT"),
    kUrowid: _ => make_keyword("UROWID"),
    kUsing: _ => make_keyword("USING"),
    kValue: _ => make_keyword("VALUE"),
    kVar: _ => make_keyword("VAR_"),
    kVarchar2: _ => make_keyword("VARCHAR2"),
    kVarchar: _ => make_keyword("VARCHAR"),
    kVariance: _ => make_keyword("VARIANCE"),
    kVarray: _ => make_keyword("VARRAY"),
    kVarying: _ => make_keyword("VARYING"),
    kVersions: _ => make_keyword("VERSIONS"),
    kWNDS: _ => make_keyword("WNDS"),
    kWNPS: _ => make_keyword("WNPS"),
    kWait: _ => make_keyword("WAIT"),
    kWhen: _ => make_keyword("WHEN"),
    kWhere: _ => make_keyword("WHERE"),
    kWith: _ => make_keyword("WITH"),
    kXml: _ => make_keyword("XML"),
    kXmlNamespaces: _ => make_keyword("XMLNAMESPACES"),
    kXmlTable: _ => make_keyword("XMLTABLE"),
    kXmlattributes: _ => make_keyword("XMLATTRIBUTES"),
    kXmlnamespaces: _ => make_keyword("XMLNAMESPACES"),
    kXmltable: _ => make_keyword("XMLTABLE"),
    kXmltype: _ => make_keyword("XMLTYPE"),
    kYear: _ => make_keyword("YEAR"),
    kYes: _ => make_keyword("YES"),
    kYmintervalUnconstrained: _ => make_keyword("YMINTERVAL_UNCONSTRAINED"),
    kZone: _ => make_keyword("ZONE"),


    outer_join_sign: $ => seq('(', '+', ')'),

    literal: $ => prec(2,
      choice(
        $._integer,
        $._decimal_number,
        $._literal_string,
        // $._bit_string,
        // $._string_casting,
        $.kTrue,
        $.kFalse,
        $.kNull,
      ),
    ),

    comment: _ => /--.*/,
    // https://stackoverflow.com/questions/13014947/regex-to-match-a-c-style-multiline-comment
    marginalia: _ => /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//,

    _double_quote_string: _ => /"[^"]*"/,

    _single_quote_string: _ => seq(/([uU]&)?'([^']|'')*'/, repeat(/'([^']|'')*'/)),
    _literal_string: $ => prec(
      1,
      choice(
        $._single_quote_string,
        $._double_quote_string,
        // $._dollar_quoted_string,
      ),
    ),

    _natural_number: _ => /\d+/,
    _integer: $ => seq(
      optional(choice("-", "+")),
      /(0[xX][0-9A-Fa-f]+(_[0-9A-Fa-f]+)*)|(0[oO][0-7]+(_[0-7]+)*)|(0[bB][01]+(_[01]+)*)|(\d+(_\d+)*(e[+-]?\d+(_\d+)*)?)/
    ),
    _negative_decimal_number: $ => seq(
      "-",
      /((\d+(_\d+)*)?[.]\d+(_\d+)*(e[+-]?\d+(_\d+)*)?)|(\d+(_\d+)*[.](e[+-]?\d+(_\d+)*)?)/
    ),
    _decimal_number: $ => seq(
      optional(
        choice("-", "+")),
      /((\d+(_\d+)*)?[.]\d+(_\d+)*(e[+-]?\d+(_\d+)*)?)|(\d+(_\d+)*[.](e[+-]?\d+(_\d+)*)?)/
    ),

    identifier: $ => choice(
      $._identifier,
      $._double_quote_string,
      /`([a-zA-Z_][0-9a-zA-Z_]*)`/,
    ),
    _identifier: _ => /[a-zA-Z_][0-9a-zA-Z_]*/,
  }
});

function commaSep1(rule) {
  return sep1(rule, ",");
}

function commaSep(rule) {
  return optional(sep1(rule, ","));
}

function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}

function wrapped_in_parenthesis(node) {
  if (node) {
    return seq("(", node, ")");
  }
  return seq("(", ")");
}

function parametric_type($, type, params = ['size']) {
  return prec.right(1,
    choice(
      type,
      seq(
        type,
        wrapped_in_parenthesis(
          seq(
            // first parameter is guaranteed, shift it out of the array
            field(params.shift(), alias($._natural_number, $.literal)),
            // then, fill in the ", next" until done
            ...params.map(p => seq(',', field(p, alias($._natural_number, $.literal)))),
          ),
        ),
      ),
    ),
  )
}

function make_keyword(word) {
  str = "";
  for (var i = 0; i < word.length; i++) {
    str = str + "[" + word.charAt(i).toLowerCase() + word.charAt(i).toUpperCase() + "]";
  }
  return new RegExp(str);
}
