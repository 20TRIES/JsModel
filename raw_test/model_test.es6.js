import Builder from "../src/Builder";

var assert = require('chai').assert;

suite('Model', function() {
    test('test_appends_adds_variable_to_query_string_that_doesnt_have_filters', function () {
        let builder = new Builder({});
        builder.append('page', 5);
        assert.equal(builder.toQueryString(), '?page=5');
    });
    test('test_appends_adds_variable_to_query_string_that_has_filters', function () {
        let builder = new Builder({});
        builder.where('mock_filter', 'mock_value')
        builder.append('page', 5);
        assert.equal(builder.toQueryString(), '?filters[mock_filter][]=mock_value&page=5');
    });
    test('test_appends_returns_self', function () {
        assert.instanceOf((new Builder({})).append('page', 5), Builder);
    });
});