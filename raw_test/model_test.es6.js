import Builder from "../src/Builder";
import Model from "../src/Model";
import DuplicateVariableException from "../src/Exceptions/DuplicateVariableException";
import UnknownVariableException from "../src/Exceptions/UnknownVariableException";
import chai from "chai/chai";
import HttpDriver from "../src/HttpDrivers/HttpDriver";
import HttpRequest from "../src/HttpRequest";
import Moment from 'moment/moment';
import Str from 'string';

// Have to require sinon at the moment because relative paths within the package seem to be from the root of that
// package and not the location of the current file; until a fix is found for this, import cannot be used.
var sinon = require('sinon');

suite('Model', function() {

    // MODEL CONSTRUCTION
    test('test_attributes_set_within_nested_attributes_object', function () {
        let attributes = {
            id: 5,
            first_name: "Marcus",
            last_name: "Turner",
            age: 24,
        };
        chai.assert.equal(JSON.stringify((new Model(attributes))._attributes), JSON.stringify(attributes));
    });

    // SYNCHRONIZATION
    test('test_get_is_syncing_returns_the_models_syncing_attribute', function () {
        let model = new Model();
        model._syncing = true;
        chai.assert.equal(model.isSyncing(), true);
        model._syncing = false;
        chai.assert.equal(model.isSyncing(), false);
    });

    // EXISTS
    test('test_exists_returns_the_exists_attribute', function () {
        let model = new Model();
        model._exists = true;
        chai.assert.equal(model.exists(), true);
        model._exists = false;
        chai.assert.equal(model.exists(), false);
    });

    // PRIMARY KEY
    test('test_get_primary_key_returns_the_models_primary_key_attribute_name', function () {
        let model = new Model();
        model._primary_key = 'foo_key';
        chai.assert.equal(model.getPrimaryKey(), 'foo_key');
    });

    // URL
    test('test_get_url_returns_the_models_url', function () {
        let model = new Model();
        model._url = 'foo_url';
        chai.assert.equal(model.getUrl(), 'foo_url');
    });

    // DIRTY
    test('test_dirty_method_exists', function () {
        chai.assert.isFunction((new Model()).dirty);
    });
    test('test_new_model_that_does_not_exist_is_all_dirty', function () {
        let attributes = {
            id: 5,
            first_name: "Marcus",
            last_name: "Turner",
            age: 24,
        };
        let model = new Model(attributes);
        chai.assert.equal(JSON.stringify(model.dirty()), JSON.stringify(attributes));
    });


    // ATTRIBUTE ACCESSORS
    test('test_attributes_can_be_gotten_from_a_model', function () {
        let MockDateMutatingModel = class extends Model {};
        let model = new MockDateMutatingModel({
            id: 5,
            first_name: "Marcus",
            last_name: "Turner",
            age: 24,
        });
        chai.assert.equal(model.id, 5);
        chai.assert.equal(model.first_name, "Marcus");
        chai.assert.equal(model.last_name, "Turner");
        chai.assert.equal(model.age, 24);
    });
    test('test_accessor_can_be_defined', function () {
        let MockDateMutatingModel = class extends Model {
            constructor(data = {}) {
                super(data);
            }
            getFooAttribute() {
                return 'foo';
            }
        };
        let model = new MockDateMutatingModel({foo: 'bar'});
        chai.assert.equal(model.foo, 'foo');
    });
    test('test_get_attributes_returns_all_attributes', function() {
        let attributes = {
            id: 5,
            first_name: "Marcus",
            last_name: "Turner",
            age: 24,
        };
        let model = new Model(attributes);
        chai.assert.equal(JSON.stringify(model.getAttributes()), JSON.stringify(attributes));
    });
    test('test_get_attributes_returns_mutated_values', function() {
        let attributes = {
            id: 5,
            first_name: "marcus",
            last_name: "Turner",
            age: 24,
        };
        let MockDateMutatingModel = class extends Model {
            getFirstNameAttribute() {
                return new Str(this._attributes.first_name).capitalize().toString();
            }
        };
        let model = new MockDateMutatingModel(attributes);
        let model_attributes = model.getAttributes();
        chai.assert.equal(model_attributes.first_name, 'Marcus');
    });
    test('test_attributes_cannot_be_changed_through_results_of_get_attributes', function() {
        let attributes = {
            id: 5,
            first_name: "Marcus",
            last_name: "Turner",
            age: 24,
        };
        let model = new Model(attributes);
        model.getAttributes().id = 0;
        chai.assert.equal(model.id, 5);
    });

    
    // ATTRIBUTE MUTATORS
    test('test_attributes_can_be_set_to_a_model', function () {
        let MockDateMutatingModel = class extends Model {
            constructor(data = {}) {
                super(data);
            }
        };
        let model = new MockDateMutatingModel({foo: 989});
        model.foo = 77;
        chai.assert.equal(model.foo, 77);
    });
    test('test_mutator_can_be_defined', function () {
        let MockDateMutatingModel = class extends Model {
            constructor(data = {}) {
                super(data);
            }
            setFooAttribute(value) {
                this._attributes.foo = value;
            }
        };
        let model = new MockDateMutatingModel({foo: 'bar'});
        model.foo = 'foo';
        chai.assert.equal(model.foo, 'foo');
    });


    // DATE MUTATION
    test('test_dates_can_be_set_within_child_model_constuctor', function () {
        let MockDateMutatingModel = class extends Model {
            constructor(data = {}) {
                this._dates = ['foo'];
                super(data);
            }
        };
        let dates = (new MockDateMutatingModel())._dates;
        chai.assert.equal(JSON.stringify(dates), JSON.stringify(['foo']));
    });
    test('test_dates_are_mutated_to_instances_of_moment_js', function () {
        let MockDateMutatingModel = class extends Model {
            constructor(data = {}) {
                this._dates = ['foo'];
                super(data);
            }
        };
        let model = new MockDateMutatingModel({'foo': '2016-07-24 15:16:56'});
        let result = model.foo;
        chai.assert.instanceOf(result, Moment);
        chai.assert.equal(result.year(), 2016);
        chai.assert.equal(result.month() + 1, 7);
        chai.assert.equal(result.date(), 24);
        chai.assert.equal(result.hour(), 15);
        chai.assert.equal(result.minute(), 16);
        chai.assert.equal(result.second(), 56);
    });
    test('test_date_can_be_set_by_string', function () {
        let MockDateMutatingModel = class extends Model {
            constructor(data = {foo: null}) {
                this._dates = ['foo'];
                super(data);
            }
        };
        let model = new MockDateMutatingModel();
        model.foo = '2016-07-24T15:16:56';
        let result = model.foo;
        chai.assert.instanceOf(result, Moment);
        chai.assert.equal(result.year(), 2016);
        chai.assert.equal(result.month() + 1, 7);
        chai.assert.equal(result.date(), 24);
        chai.assert.equal(result.hour(), 15);
        chai.assert.equal(result.minute(), 16);
        chai.assert.equal(result.second(), 56);
    });
    test('test_date_can_be_set_by_moment', function () {
        let MockDateMutatingModel = class extends Model {
            constructor(data = {}) {
                this._dates = ['foo'];
                super(data);
            }
        };
        let model = new MockDateMutatingModel();
        model.foo = new Moment('2016-07-24 15:16:56');
        let result = model.foo;
        chai.assert.instanceOf(result, Moment);
        chai.assert.equal(result.year(), 2016);
        chai.assert.equal(result.month() + 1, 7);
        chai.assert.equal(result.date(), 24);
        chai.assert.equal(result.hour(), 15);
        chai.assert.equal(result.minute(), 16);
        chai.assert.equal(result.second(), 56);
    });

    // ORDER BY
    test('test_order_by_is_shortcut_to_builder_method', function () {
        let mock_attribute = 'mock_var_name';
        let mock_direction = 'desc';
        let builder = (new Model()).orderBy(mock_attribute, mock_direction);
        chai.assert.instanceOf(builder, Builder);
        chai.assert.equal(JSON.stringify([mock_attribute, mock_direction]), JSON.stringify(builder.orderingBy()));
    });

    // CLONE
    test('test_clone_method', function () {
        let mock_attributes = {"mock_attr": "mock_value"};
        let model = new Model(mock_attributes);
        model._exists = true;
        model._syncing = true;
        model._original = 'mock_orginal';
        let clone = model.clone();
        chai.assert.equal(true, clone._syncing);
        chai.assert.equal(JSON.stringify(mock_attributes), JSON.stringify(clone._attributes));
        chai.assert.equal("mock_value", clone["mock_attr"]);
        chai.assert.equal(true, clone._exists);
        chai.assert.equal('mock_orginal', clone._original);
    });
    test('test_clone_deep_clones', function () {
        let mock_attributes = {mock_attr: "mock_value"};
        let model = new Model(mock_attributes);
        let clone = model.clone();
        clone._attributes.mock_attr = "other_mock_value";
        chai.assert.equal("mock_value", model._attributes.mock_attr);
    });
});

suite('Builder', function() {

    // GET VARIABLE
    test('test_getVariable_returns_default_value_if_no_variable_is_set', function () {
        let expected = 'mock_result_1872';
        chai.assert.equal((new Builder()).getVariable('mock_variable_1213421', expected), expected);
    });

    // APPENDS
    test('test_appends_adds_variable_to_query_string_that_doesnt_have_filters', function () {
        let builder = new Builder({});
        let original_query_string = builder.toQueryString();
        let mock_name = 'mock_var_name';
        let mock_value = 5;
        builder.append(mock_name, mock_value);
        chai.assert.equal(builder.toQueryString(), `${original_query_string == "" ? "?" : original_query_string + "&"}${mock_name}=${mock_value}`);
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
        chai.assert.equal(builder.toQueryString(), `?filters[${mock_filter_name}][]=${mock_filter_value}${original_query_string == "" ? "" : "&" + original_query_string}&${mock_var_name}=${mock_var_value}`);
    });
    test('test_appends_url_encodes_the_name_and_value_off_apended_variables', function () {
        let builder = new Builder({});
        let original_query_string = builder.toQueryString();
        let mock_name = 'mock_va/r_name';
        let mock_value = "a/b";
        builder.append(mock_name, mock_value);
        chai.assert.equal(builder.toQueryString(), `${original_query_string == "" ? "?" : original_query_string + "&"}${encodeURIComponent(mock_name)}=${encodeURIComponent(mock_value)}`);
    });
    test('test_appends_returns_self', function () {
        chai.assert.instanceOf((new Builder({})).append('mock_var_name', 5), Builder);
    });
    test('test_update_appended_value', function () {
        let builder = new Builder({});
        let mock_var_name = 'mock_var_name';
        let mock_val_1 = '1';
        let mock_val_2 = '2';
        builder.append(mock_var_name, mock_val_1);
        builder.updateVariable(mock_var_name, mock_val_2);
        chai.assert.equal(mock_val_2, builder.getVariable(mock_var_name));
    });
    test('test_exception_is_thrown_if_attempt_is_made_to_append_duplicate_variable', function () {
        chai.assert.throws(() => {
            let builder = new Builder({});
            builder.append('var', 1);
            builder.append('var', 2);
        }, DuplicateVariableException);
    });
    test('test_exception_is_thrown_if_attempt_is_made_to_update_unknown_variable', function () {
        chai.assert.throws(() => {
            let builder = new Builder({});
            builder.updateVariable('var', 1);
        }, UnknownVariableException);
    });
    test('test_that_appends_store_array_values', function () {
        let builder = new Builder({});
        let mock_var_name = 'mock_var_name';
        let mock_val_1 = [1,2,3];
        builder.append(mock_var_name, mock_val_1);
        chai.assert.equal(mock_val_1, builder.getVariable(mock_var_name));
    });
    test('test_that_to_query_string_correctly_handles_appends_with_array_values', function () {
        let builder = new Builder({});
        let original_query_string = builder.toQueryString();
        let mock_name = 'mock';
        let mock_value = [1,2,3];
        builder.append(mock_name, mock_value);
        chai.assert.equal(builder.toQueryString(), `${original_query_string == "" ? "?" : original_query_string + "&"}${mock_name}[]=1&${mock_name}[]=2&${mock_name}[]=3`);
    });
    test('test_that_appends_store_object_values', function () {
        let builder = new Builder({});
        let mock_var_name = 'mock_var_name';
        let mock_val_1 = {"one":1, "two":2, "three":3};
        builder.append(mock_var_name, mock_val_1);
        chai.assert.equal(JSON.stringify(mock_val_1), JSON.stringify(builder.getVariable(mock_var_name)));
    });
    test('test_that_to_query_string_correctly_handles_appends_with_object_values', function () {
        let builder = new Builder({});
        let original_query_string = builder.toQueryString();
        let mock_name = 'mock';
        let mock_value = {"one":1, "two":2, "three":3};
        builder.append(mock_name, mock_value);
        chai.assert.equal(builder.toQueryString(), `${original_query_string == "" ? "?" : original_query_string + "&"}${mock_name}[one]=1&${mock_name}[two]=2&${mock_name}[three]=3`);
    });

    // LIMIT
    test('test_that_default_limit_of_fifteen_is_set', function () {
        let builder = new Builder({});
        chai.assert.equal(builder.getLimit(), 15);
    });
    test('test_set_limit', function () {
        let builder = new Builder({});
        let mock_limit = 9999;
        builder.setLimit(mock_limit);
        chai.assert.equal(builder.getLimit(), mock_limit);
    });
    test('test_set_limit_takes_a_negative_value', function () {
        let builder = new Builder({});
        let mock_limit = -1;
        builder.setLimit(mock_limit);
        chai.assert.equal(builder.getLimit(), mock_limit);
    });
    test('test_limit_is_incorperated_into_query_string', function () {
        // Limit is currently handled as an "append" and as such is covered for this under
        // that methods tests.
    });
    test('test_that_setLimit_returns_self', function () {
        chai.assert.instanceOf((new Builder({})).setLimit(10), Builder);
    });

    // PAGE
    test('test_that_default_page_is_set_to_one', function () {
        let builder = new Builder({});
        chai.assert.equal(builder.currentPage(), 1);
    });
    test('test_set_page', function () {
        let builder = new Builder({});
        let mock_page = 9999;
        builder.setPage(mock_page);
        chai.assert.equal(builder.currentPage(), mock_page);
    });
    test('test_increment_page', function () {
        let builder = new Builder({});
        builder.incrementPage();
        chai.assert.equal(builder.currentPage(), 2);
    });
    test('test_decrement_page', function () {
        let builder = new Builder({});
        builder.decrementPage();
        chai.assert.equal(builder.currentPage(), 0);
    });
    test('test_page_is_incorporated_into_query_string', function () {
        // Page is currently handled as an "append" and as such is covered for this under
        // that methods tests.
    });
    test('test_that_setPage_returns_self', function () {
        chai.assert.instanceOf((new Builder({})).setPage(10), Builder);
    });


    // ORDERING
    test('test_that_ordering_is_off_by_default', function () {
        let builder = new Builder({});
        chai.assert.equal(builder.orderingBy(), null);
    });
    test('test_order_by', function () {
        let builder = new Builder({});
        let mock_attribute = 'some_mock_attribute';
        let mock_direction = 'desc';
        builder.orderBy(mock_attribute, mock_direction);
        chai.assert.equal(JSON.stringify([mock_attribute, mock_direction]), JSON.stringify(builder.orderingBy()));
    });
    test('test_changes_made_to_ordering_by_result_do_not_effect_query_constraint', function () {
        let builder = new Builder({});
        let mock_attribute = 'some_mock_attribute';
        let mock_direction = 'desc';
        builder.orderBy(mock_attribute, mock_direction);
        let ordering = builder.orderingBy();
        ordering[0] = 'foo';
        chai.assert.equal(JSON.stringify([mock_attribute, mock_direction]), JSON.stringify(builder.orderingBy()));
    });
    test('test_order_by_returned_itself', function () {
        let builder = new Builder({});
        let result = builder.orderBy('some_mock_attribute', 'desc');
        chai.assert.equal(JSON.stringify(builder), JSON.stringify(result));
    });
    test('test_order_by_takes_multiple_orderings', function () {
        let builder = new Builder({});
        let mock_attribute_1 = 'some_mock_attribute_!';
        let mock_direction_1 = 'desc_1';
        let mock_attribute_2 = 'some_mock_attribute_2';
        let mock_direction_2 = 'desc_2';
        builder.orderBy(mock_attribute_1, mock_direction_1, mock_attribute_2, mock_direction_2);
        chai.assert.equal(JSON.stringify([mock_attribute_1, mock_direction_1, mock_attribute_2, mock_direction_2]), JSON.stringify(builder.orderingBy()));
    });


    // WHERE
    test('test_where', function () {
        let builder = new Builder({});
        let default_query_string = builder.toQueryString().substring(1);
        builder.where('mock_attribute', 'mock_value')
        let expected = '?filters[mock_attribute][]=mock_value' + `&${default_query_string}`;
        chai.assert.equal(expected, builder.toQueryString());
    });


    // CONSTRAINTS
    test('test_has_constraint', function () {
        let builder = new Builder({});
        let mock_constraint_name = 'mock_constraint_name';
        let mock_constraint_value = 'mock_constraint_value';
        builder.where(mock_constraint_name, mock_constraint_value);
        chai.assert.equal(builder.hasConstraint(mock_constraint_name), true);
    });
    test('test_get_constraint_value', function () {
        let builder = new Builder({});
        let mock_constraint_name = 'mock_constraint_name';
        let mock_constraint_value = 'mock_constraint_value';
        builder.where(mock_constraint_name, mock_constraint_value);
        chai.assert.equal(builder.getConstraintValue(mock_constraint_name), mock_constraint_value);
    });
    test('test_changes_made_to_the_value_returned_by_get_constrain_do_not_effect_the_query', function () {
        let builder = new Builder({});
        let mock_constraint_name = 'mock_constraint_name';
        let mock_constraint_value = {mock: 'mock'};
        builder.where(mock_constraint_name, {mock: 'mock'});
        builder.getConstraintValue(mock_constraint_name).mock = 'not mock';
        chai.assert.equal(JSON.stringify(builder.getConstraintValue(mock_constraint_name)), JSON.stringify(mock_constraint_value));
    });

    // FIRST
    test('test_first_method_sets_limit_on_query', function () {
        let driver = class extends HttpDriver {
            static execute(request) {
                chai.assert.notEqual(request.getUrl().search(/(\?|&)limit=1($|&)/), -1);
            }
        };
        let model = class extends Model {
            constructor(data = {}) {
                super(data);
                this._url = '';
            }
        };
       (new Builder(model, driver)).first();
    });
    test('test_first_method_executes_query', function () {
        var mock_return_value = false;
        let driver = class extends HttpDriver {
            static execute(request) {
                mock_return_value = true;
            }
        };
        let model = class extends Model {
            constructor(data = {}) {
                super(data);
                this._url = '';
            }
        };
        (new Builder(model, driver)).first();
        chai.assert.equal(mock_return_value, true);
    });
    test('test_first_method_passes_callbacks_through_request', function () {
        let success = sinon.spy();
        let error = sinon.spy();
        let driver = class extends HttpDriver {
            static execute(request) {
                request.success({data: []});
                request.error();
            }
        };
        (new Builder((new Model()), driver)).first(success, error);
        chai.assert.equal(success.called, true);
        chai.assert.equal(error.called, true);
    });
    test('test_first_method_returns_first_result_not_collection', function () {
        let success = sinon.spy((data) => {
            chai.assert.instanceOf(data, Model, "Expected callback to be passed a model instance");
        });
        let driver = class extends HttpDriver {
            static execute(request) {
                request.success({data: [{id: 1},{id: 2},{id: 3}]});
            }
        };
        (new Builder((new Model()), driver)).first(success);
        chai.assert.equal(success.called, true, 'Expected callback to be called');
    });
});


suite('HttpRequest', function() {

    // SUCCESS
    test('test_request_doesnt_change_the_original_value_of_this_within_closures_set_within_it', function () {
        let request = new HttpRequest();
        this.mock_name = 'mock_name';
        request.onSuccess(() => this.mock_name);
        chai.assert.equal(request.success(), this.mock_name);
    });
});

