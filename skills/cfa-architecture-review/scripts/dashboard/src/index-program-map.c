#include "indexstore.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct { indexstore_t store; const char *module; char file[4096]; } Context;
static void json(indexstore_string_ref_t s) {
    putchar('"');
    for (size_t i = 0; i < s.length; i++) {
        unsigned char c = s.data[i];
        if (c == '"' || c == '\\') { putchar('\\'); putchar(c); }
        else if (c < 32) printf("\\u%04x", c);
        else putchar(c);
    }
    putchar('"');
}
static void field(const char *key, indexstore_string_ref_t value) { printf(",\"%s\":", key); json(value); }
static bool relation(void *ctx, indexstore_symbol_relation_t rel) {
    (void)ctx;
    if (indexstore_symbol_relation_get_roles(rel) & INDEXSTORE_SYMBOL_ROLE_REL_CALLEDBY) {
        indexstore_symbol_t s = indexstore_symbol_relation_get_symbol(rel);
        field("caller", indexstore_symbol_get_name(s));
        field("callerID", indexstore_symbol_get_usr(s));
    }
    return true;
}
static bool occurrence(void *ctx, indexstore_occurrence_t occ) {
    Context *c = ctx;
    if (!(indexstore_occurrence_get_roles(occ) & INDEXSTORE_SYMBOL_ROLE_CALL)) return true;
    unsigned line = 0, column = 0;
    indexstore_occurrence_get_line_col(occ, &line, &column);
    indexstore_symbol_t s = indexstore_occurrence_get_symbol(occ);
    printf("{\"file\":"); json((indexstore_string_ref_t){c->file, strlen(c->file)});
    printf(",\"line\":%u,\"column\":%u", line, column);
    field("callee", indexstore_symbol_get_name(s));
    field("calleeID", indexstore_symbol_get_usr(s));
    indexstore_occurrence_relations_apply_f(occ, NULL, relation);
    puts("}");
    return true;
}
static bool dependency(void *ctx, indexstore_unit_dependency_t dep) {
    Context *c = ctx;
    if (indexstore_unit_dependency_get_kind(dep) != INDEXSTORE_UNIT_DEPENDENCY_RECORD || indexstore_unit_dependency_is_system(dep)) return true;
    indexstore_string_ref_t file = indexstore_unit_dependency_get_filepath(dep), name = indexstore_unit_dependency_get_name(dep);
    if (!file.data || file.length >= sizeof(c->file) || name.length >= 1024) return true;
    memcpy(c->file, file.data, file.length); c->file[file.length] = 0;
    if (!strstr(c->file, ".swift")) return true;
    char record[1024]; memcpy(record, name.data, name.length); record[name.length] = 0;
    indexstore_error_t error = NULL;
    indexstore_record_reader_t reader = indexstore_record_reader_create(c->store, record, &error);
    if (!reader) { if (error) indexstore_error_dispose(error); return true; }
    indexstore_record_reader_occurrences_apply_f(reader, c, occurrence);
    indexstore_record_reader_dispose(reader);
    return true;
}
static bool unit(void *ctx, indexstore_string_ref_t name) {
    Context *c = ctx; char n[1024];
    if (name.length >= sizeof(n)) return true;
    memcpy(n, name.data, name.length); n[name.length] = 0;
    indexstore_error_t error = NULL;
    indexstore_unit_reader_t reader = indexstore_unit_reader_create(c->store, n, &error);
    if (!reader) { if (error) indexstore_error_dispose(error); return true; }
    indexstore_string_ref_t module = indexstore_unit_reader_get_module_name(reader);
    if (module.length == strlen(c->module) && !strncmp(module.data, c->module, module.length)) indexstore_unit_reader_dependencies_apply_f(reader, c, dependency);
    indexstore_unit_reader_dispose(reader);
    return true;
}
int main(int argc, char **argv) {
    if (argc != 3) { fprintf(stderr, "Usage: index-program-map <index-store> <module>\n"); return 2; }
    Context c = {.module = argv[2]}; indexstore_error_t error = NULL;
    c.store = indexstore_store_create(argv[1], &error);
    if (!c.store) { fprintf(stderr, "Cannot open index: %s\n", error ? indexstore_error_get_description(error) : "unknown error"); return 1; }
    indexstore_store_units_apply_f(c.store, 0, &c, unit);
    indexstore_store_dispose(c.store);
    return 0;
}
