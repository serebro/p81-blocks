const MongoClient = require('mongodb').MongoClient;

const client = new MongoClient(process.env.npm_package_config_mongodb_url, {useUnifiedTopology: true});

const blockForUseRequest = [
    {Block_ID: "A", Block_Quantity: 2},
    {Block_ID: "B", Block_Quantity: 1},
    {Block_ID: "C", Block_Quantity: 2},
    {Block_ID: "E", Block_Quantity: 1},
];

// list of block ids: [A, B, C, E]
const blockIds = blockForUseRequest.map(rec => (rec.Block_ID));

// index: {A: 2}, {B: 1}, {C: 2}, {E: 1}
const blockForUseRequestIndex = {};
blockForUseRequest.forEach(rec => {
    blockForUseRequestIndex[rec.Block_ID] = rec.Block_Quantity;
});


client.connect().then(_ => {

    const db = client.db(process.env.npm_package_config_dbName);
    const query = [
        {
            $match: {
                Block_ID: {$in: blockIds}
            }
        },
        {
            $sort: {Block_ID: 1}
        },
        {
            $lookup: {
                from: "blockRepository",
                localField: "Block_Type",
                foreignField: "Block_Type",
                as: "Block_Refs"
            }
        }
    ];

    const preparation = records => {
        const results = [];
        records.forEach(record => {
            let requestQuantity = blockForUseRequestIndex[record.Block_ID];

            record.Block_Refs.forEach(Block_Ref => {
                results.push({
                    type: `${Block_Ref.Block_Type} ${Block_Ref.Block_Ref_ID}`,
                    status: requestQuantity-- ? 'USED' : 'UNUSED'
                });
            });

            if (record.Block_Refs.length < blockForUseRequestIndex[record.Block_ID]) {
                results.push({
                    type: record.Block_Type,
                    status: null,
                });
            }
        });

        return results;
    };

    const rotateTable = records => {
        const results = {};
        records.forEach(record => {
            results[record.type] = record.status;
        });

        return [results];
    };

    const store = records => {
        db.collection('blockActualWorkload').insertMany(records);

        return records;
    };

    const output = records => {
        console.log(JSON.stringify(records));

        return records;
    };

    db.collection('blockAsset')
        .aggregate(query)
        .toArray()
        .then(preparation)
        .then(rotateTable)
        .then(output)
        .then(store)
        .then(_ => {process.exit(0)});
});
