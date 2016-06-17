import Builder from "./Builder";
import Collection from "js_collection";

/**
 * A base Model class.
 */
export default class Model {
    /**
     * Constructor
     */
    constructor(data) {
        this.url = '/';
        this.primary_key = 'id';
        this.primary_filter = 'id';
        this.original = {};
        this.attributes = {};
        this.syncing = false;
        this.exists = false;
        this.default_attributes = {};
        this.dates = ['created_at', 'updated_at'];
        this.hydrate(data);
    }

    /**
     * Populates a new model with a set of data.
     *
     * @param {Object} attributes
     * @returns {Model}
     */
    hydrate(attributes) {
        for(var key in attributes) {
            this.attributes[key] = attributes[key];
            this.original[key] = attributes[key];
            var attribute_name = key;

            // Define getters and setters for the model.
            if(this.dates.indexOf(key) != -1) {
                Object.defineProperty(this, key, {
                    "configurable": true,
                    "get": (function(attribute_name) {
                        return function() {
                            return moment(this.attributes[attribute_name]);
                        }
                    })(attribute_name),
                    "set": (function(attribute_name) {
                        return function(value) {
                            if(typeof value._isAMomentObject != 'undefined' && value._isAMomentObject == true) {
                                this.attributes[attribute_name] = value.format();
                            } else {
                                this.attributes[attribute_name] = value;
                            }
                        }
                    })(attribute_name)
                });
            } else {
                Object.defineProperty(this, key, {
                    "configurable": true,
                    "get": (function(attribute_name) {
                        return function() {
                            return this.attributes[attribute_name];
                        }
                    })(attribute_name),
                    "set": (function(attribute_name) {
                        return function(value) {
                            this.attributes[attribute_name] = value;
                        }
                    })(attribute_name)
                });
            }
        }
        return this;
    }

    /**
     * Creates a builder for performing queries about a model.
     *
     * @param {*} attribute
     * @param {*} value
     * @returns {Builder}
     */
    where(attribute, value) {
        return (new Builder(this)).where(attribute, value);
    }

    /**
     * Gets all records for a model.
     *
     * @returns {Collection}
     */
    all(success, error) {
        return new Builder(this).get(success, error);
    }

    /**
     * Creates a new collection.
     *
     * @param {Array} data
     * @returns {*}
     */
    newCollection(data) {
        return new Collection(this.primary_key, data);
    }

    /**
     * Gets the attributes of a model that have been changed.
     *
     * @returns Object
     */
    dirty() {
        var dirty = {};
        for(var key in this.attributes) {
            var value = this.attributes[key];
            if(value != this.original[key]) {
                if(value != null && typeof value === 'object') {
                    dirty[key] = jQuery.extend({}, this.attributes[key]);
                } else {
                    dirty[key] = value;
                }
            }
        }
        return dirty;
    }

    /**
     * Saves a model.
     *
     * @param {callable} success
     * @param {callable} error
     */
    save(success, error) {
        var instance = this;
        instance.syncing = true;

        var attributes = this.dirty();
        attributes[this.primary_key] = this.attributes[this.primary_key];

        var builder = new Builder(this);
        if(this.exists) {
            builder
                .where(this.primary_filter, this.attributes[this.primary_key])
                .update(attributes, (function(instance, success) {
                    return function(results, payload) {
                        instance.syncing = false;
                        for(var key in results.items) {
                            var updated_contact = results.items[key];
                            if(updated_contact.customer_contact_id == instance.customer_contact_id) {
                                instance.hydrate(updated_contact.attributes);
                            }
                        }
                        if(typeof success == 'function') {
                            success(results, payload);
                        }
                    }
                })(this, success), (function(instance, error) {
                    return function (response, code) {
                        if (code == 422) {
                            instance.syncing = false;
                        }
                        builder.handleError(response, code);
                        if (typeof error == 'function') {
                            error();
                        }
                    }
                })(this, error));
        } else {
            builder.insert(attributes, function(model) {
                    instance.syncing = false;
                    instance.customer_contact_id = model.customer_contact_id;
                    instance.hydrate(model.attributes);
                    instance.exists = true;
                    if (typeof success == 'function') {
                        success();
                    }
                },
                function(response, code) {
                    if(code == 422) {
                        instance.syncing = false;
                    }
                    builder.handleError(response, code);
                    if(typeof error == 'function') {
                        error();
                    }
                });
        }
    }

    /**
     * Resets a models attributes to their original values.
     */
    reset()
    {
        for(var key in this.attributes)
        {
            if(this.original[key] != 'undefined') {
                this.attributes[key] = this.original[key];
            } else {
                delete this.attributes[key];
            }
        }
    }

    /**
     * Deletes a model.
     *
     * @param success
     * @param error
     */
    delete(success, error)
    {
        var instance = this;

        instance.syncing = true;

        var builder = new Builder(this);

        if(this.exists) {
            builder
                .where(this.primary_filter, this.attributes[this.primary_key])
                .delete((function(success) {
                    return function(results) {
                        instance.syncing = false;
                        instance.hydrate(results.first().attributes);
                        if(typeof success == 'function') {
                            success();
                        }
                    }
                })(this.attributes, success), (function(error) {
                    return function (response, code) {
                        if (code == 422 || code == 403) {
                            instance.syncing = false;
                            instance.reset();
                        }
                        builder.handleError(response, code);
                        if (typeof error == 'function') {
                            error();
                        }
                    }
                })(error));
        }
    }
}