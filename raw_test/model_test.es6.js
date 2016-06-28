import Builder from "../src/Builder";

var assert = require('chai').assert;

suite('Model', function() {

});

suite('Builder', function() {

    // APPENDS
    test('test_appends_adds_variable_to_query_string_that_doesnt_have_filters', function () {
        let builder = new Builder({});
        let original_query_string = builder.toQueryString();
        let mock_name = 'mock_var_name';
        let mock_value = 5;
        builder.append(mock_name, mock_value);
        assert.equal(builder.toQueryString(), `${original_query_string == "" ? "?" : "&" + original_query_string}${mock_name}=${mock_value}`);
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
    test('test_appends_returns_self', function () {
        assert.instanceOf((new Builder({})).append('page', 5), Builder);
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
});