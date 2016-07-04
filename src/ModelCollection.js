import Collection from "js_collection";
import MissingQueryBuilderException from "./MissingQueryBuilderException";

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

    /**
     * Loads the next page of results.
     *
     * If a success callback is not provided, then the results will be merged into the current collection; otherwise,
     * this will be left to the callback provided.
     *
     * Requires a builder to be set which is responsible for the collection.
     *
     * @param {Function} success
     * @param {Function} error
     */
    loadNextPage(success = null, error = null)
    {
        if(this.query != null && this.query.getLimit() !== -1) {
            let instance = this;
            this.query.incrementPage();
            this.query.get(success instanceof Function ? success : instance.merge, (...args) => {
                instance.query.decrementPage();
                if(error instanceof Function) {
                    error.apply(error, args);
                }
            });
        } else {
            throw new MissingQueryBuilderException('Cannot load next page; no query builder set for model collection!');
        }
    }
}
