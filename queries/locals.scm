;; Scopes
((create_package_body) @scope)
((create_package_header) @scope)
((block) @scope)
((function_body) @scope)
((procedure_body) @scope)

;; Definitions
((function_specification 
  (identifier) @definition.function))
((procedure_specification 
  (identifier) @definition.function))
((variable_declaration 
  (identifier) @definition.var))
((parameter_spec 
  (identifier) @definition.parameter))
((cursor_declaration 
  (identifier) @definition.cursor))
((exception_declaration 
  (identifier) @definition.type))

;; References
((identifier) @reference)