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
     * Loads the next page of results into the collection.
     *
     * Requires a builder to be set which is responsible for the collection.
     */
    loadNextPage()
    {
        if(this.query != null && this.query.getLimit() !== -1) {
            let instance = this;
            this.query.incrementPage();
            this.query.get((results) => {
                instance.merge(results);
            },() => {
                instance.query.decrementPage();
            });
        } else {
            throw new MissingQueryBuilderException('Cannot load next page; no query builder set for model collection!');
        }
    }
}
