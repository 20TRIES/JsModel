import Builder from "../src/Builder";
import Model from "../src/Model";
import DuplicateVariableException from "../src/DuplicateVariableException";
import UnknownVariableException from "../src/UnknownVariableException";

var assert = require('chai').assert;

suite('Model', function() {

    // ORDER BY
    test('test_order_by_is_shortcut_to_builder_method', function () {
        let mock_attribute = 'mock_var_name';
        let mock_direction = 'desc';
        let builder = (new Model()).orderBy(mock_attribute, mock_direction);
        assert.instanceOf(builder, Builder);
        assert.equal(JSON.stringify([mock_attribute, mock_direction]), JSON.stringify(builder.orderingBy()));
    });
});

suite('Builder', function() {

    // APPENDS
    test('test_appends_adds_variable_to_query_string_that_doesnt_have_filters', function () {
        let builder = new Builder({});
        let original_query_string = builder.toQueryString();
        let mock_name = 'mock_var_name';
        let mock_value = 5;
        builder.append(mock_name, mock_value);
        assert.equal(builder.toQueryString(), `${original_query_string == "" ? "?" : original_query_string + "&"}${mock_name}=${mock_value}`);
    });
    test('test_appends_adds_variable_to_query_string_that_has_filters', function () {
        let builder = new Builder({});
        let original_query_string = builder.toQueryString().substring(1);
        let mock_var_name = 'mock_var_name';
        let mock_var_value = 5;
        let mock_filter_name = 'mock_filter_name';
        let mock_filter_value = 10;
        builder.where(mock_filter_name, mock_filter_value);
        builder.append(mock_var_name, mock_var_value);
        assert.equal(builder.toQueryString(), `?filters[${mock_filter_name}][]=${mock_filter_value}${original_query_string == "" ? "" : "&" + original_query_string}&${mock_var_name}=${mock_var_value}`);
    });
    test('test_appends_url_encodes_the_name_and_value_off_apended_variables', function () {
        let builder = new Builder({});
        let original_query_string = builder.toQueryString();
        let mock_name = 'mock_va/r_name';
        let mock_value = "a/b";
        builder.append(mock_name, mock_value);
        assert.equal(builder.toQueryString(), `${original_query_string == "" ? "?" : original_query_string + "&"}${encodeURIComponent(mock_name)}=${encodeURIComponent(mock_value)}`);
    });
    test('test_appends_returns_self', function () {
        assert.instanceOf((new Builder({})).append('mock_var_name', 5), Builder);
    });
    test('test_update_appended_value', function () {
        let builder = new Builder({});
        let mock_var_name = 'mock_var_name';
        let mock_val_1 = '1';
        let mock_val_2 = '2';
        builder.append(mock_var_name, mock_val_1);
        builder.updateVariable(mock_var_name, mock_val_2);
        assert.equal(mock_val_2, builder.getVariable(mock_var_name));
    });
    test('test_exception_is_thrown_if_attempt_is_made_to_append_duplicate_variable', function () {
        assert.throws(() => {
            let builder = new Builder({});
            builder.append('var', 1);
            builder.append('var', 2);
        }, DuplicateVariableException);
    });
    test('test_exception_is_thrown_if_attempt_is_made_to_update_unknown_variable', function () {
        assert.throws(() => {
            let builder = new Builder({});
            builder.updateVariable('var', 1);
        }, UnknownVariableException);
    });
    test('test_that_appends_store_array_values', function () {
        let builder = new Builder({});
        let mock_var_name = 'mock_var_name';
        let mock_val_1 = [1,2,3];
        builder.append(mock_var_name, mock_val_1);
        assert.equal(mock_val_1, builder.getVariable(mock_var_name));
    });
    test('test_that_to_query_string_correctly_handles_appends_with_array_values', function () {
        let builder = new Builder({});
        let original_query_string = builder.toQueryString();
        let mock_name = 'mock';
        let mock_value = [1,2,3];
        builder.append(mock_name, mock_value);
        assert.equal(builder.toQueryString(), `${original_query_string == "" ? "?" : original_query_string + "&"}${mock_name}[]=1&${mock_name}[]=2&${mock_name}[]=3`);
    });
    test('test_that_appends_store_object_values', function () {
        let builder = new Builder({});
        let mock_var_name = 'mock_var_name';
        let mock_val_1 = {"one":1, "two":2, "three":3};
        builder.append(mock_var_name, mock_val_1);
        assert.equal(JSON.stringify(mock_val_1), JSON.stringify(builder.getVariable(mock_var_name)));
    });
    test('test_that_to_query_string_correctly_handles_appends_with_object_values', function () {
        let builder = new Builder({});
        let original_query_string = builder.toQueryString();
        let mock_name = 'mock';
        let mock_value = {"one":1, "two":2, "three":3};
        builder.append(mock_name, mock_value);
        assert.equal(builder.toQueryString(), `${original_query_string == "" ? "?" : original_query_string + "&"}${mock_name}[one]=1&${mock_name}[two]=2&${mock_name}[three]=3`);
    });

    // LIMIT
    test('test_that_default_limit_of_fifteen_is_set', function () {
        let builder = new Builder({});
        assert.equal(builder.getLimit(), 15);
    });
    test('test_set_limit', function () {
        let builder = new Builder({});
        let mock_limit = 9999;
        builder.setLimit(mock_limit);
        assert.equal(builder.getLimit(), mock_limit);
    });
    test('test_set_limit_takes_a_negative_value', function () {
        let builder = new Builder({});
        let mock_limit = -1;
        builder.setLimit(mock_limit);
        assert.equal(builder.getLimit(), mock_limit);
    });
    test('test_limit_is_incorperated_into_query_string', function () {
        // Limit is currently handled as an "append" and as such is covered for this under
        // that methods tests.
    });
    test('test_that_setLimit_returns_self', function () {
        assert.instanceOf((new Builder({})).setLimit(10), Builder);
    });

    // PAGE
    test('test_that_default_page_is_set_to_one', function () {
        let builder = new Builder({});
        assert.equal(builder.currentPage(), 1);
    });
    test('test_set_page', function () {
        let builder = new Builder({});
        let mock_page = 9999;
        builder.setPage(mock_page);
        assert.equal(builder.currentPage(), mock_page);
    });
    test('test_increment_page', function () {
        let builder = new Builder({});
        builder.incrementPage();
        assert.equal(builder.currentPage(), 2);
    });
    test('test_decrement_page', function () {
        let builder = new Builder({});
        builder.decrementPage();
        assert.equal(builder.currentPage(), 0);
    });
    test('test_page_is_incorporated_into_query_string', function () {
        // Page is currently handled as an "append" and as such is covered for this under
        // that methods tests.
    });
    test('test_that_setPage_returns_self', function () {
        assert.instanceOf((new Builder({})).setPage(10), Builder);
    });


    // ORDERING
    test('test_that_ordering_is_off_by_default', function () {
        let builder = new Builder({});
        assert.equal(builder.orderingBy(), null);
    });
    test('test_order_by', function () {
        let builder = new Builder({});
        let mock_attribute = 'some_mock_attribute';
        let mock_direction = 'desc';
        builder.orderBy(mock_attribute, mock_direction);
        assert.equal(JSON.stringify([mock_attribute, mock_direction]), JSON.stringify(builder.orderingBy()));
    });
    test('test_changes_made_to_ordering_by_result_do_not_effect_query_constraint', function () {
        let builder = new Builder({});
        let mock_attribute = 'some_mock_attribute';
        let mock_direction = 'desc';
        builder.orderBy(mock_attribute, mock_direction);
        let ordering = builder.orderingBy();
        ordering[0] = 'foo';
        assert.equal(JSON.stringify([mock_attribute, mock_direction]), JSON.stringify(builder.orderingBy()));
    });
    test('test_order_by_returned_itself', function () {
        let builder = new Builder({});
        let result = builder.orderBy('some_mock_attribute', 'desc');
        assert.equal(JSON.stringify(builder), JSON.stringify(result));
    });


    // WHERE
    test('test_where', function () {
        let builder = new Builder({});
        let default_query_string = builder.toQueryString().substring(1);
        builder.where('mock_attribute', 'mock_value')
        let expected = '?filters[mock_attribute][]=mock_value' + `&${default_query_string}`;
        assert.equal(expected, builder.toQueryString());
    });


    // CONSTRAINTS
    test('test_has_constraint', function () {
        let builder = new Builder({});
        let mock_constraint_name = 'mock_constraint_name';
        let mock_constraint_value = 'mock_constraint_value';
        builder.where(mock_constraint_name, mock_constraint_value);
        assert.equal(builder.hasConstraint(mock_constraint_name), true);
    });
    test('test_get_constraint_value', function () {
        let builder = new Builder({});
        let mock_constraint_name = 'mock_constraint_name';
        let mock_constraint_value = 'mock_constraint_value';
        builder.where(mock_constraint_name, mock_constraint_value);
        assert.equal(builder.getConstraintValue(mock_constraint_name), mock_constraint_value);
    });
    test('test_changes_made_to_the_value_returned_by_get_constrain_do_not_effect_the_query', function () {
        let builder = new Builder({});
        let mock_constraint_name = 'mock_constraint_name';
        let mock_constraint_value = {mock: 'mock'};
        builder.where(mock_constraint_name, {mock: 'mock'});
        builder.getConstraintValue(mock_constraint_name).mock = 'not mock';
        assert.equal(JSON.stringify(builder.getConstraintValue(mock_constraint_name)), JSON.stringify(mock_constraint_value));
    });
});