import Collection from "js_collection";

/**
 * A base Model collection class.
 */
export default class ModelCollection extends Collection 
{
    /**
     * Constructor
     *
     * @param {Array} items
     * @param {Model} model
     */
    constructor(items, model) 
    {
        super(items, model.primary_key);

        this.model = model;
    }

    /**
     * Sets the query that was responsible for building the collection of data.
     *
     * This is required to be set before pagination method can be used.
     *
     * @param {Builder} query
     */
    setQuery(query)
    {
        this.query = query;
    }
}
