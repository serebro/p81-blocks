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

    // We do not have memory requirement,
    // than assume that all data will not be out of 1G NodeJS memory limit and 16Mb mongo document limit
    const preparation = records => {
        const results = [];
        records.forEach(record => {
            let requestQuantity = blockForUseRequestIndex[record.Block_ID];

            record.Block_Refs.forEach(Block_Ref => {
                results.push({
                    type: Block_Ref.Block_Type,
                    ref: Block_Ref.Block_Ref_ID,
                    status: requestQuantity-- > 0 ? 'USED' : 'UNUSED'
                });
            });

            let restOfBlocks = blockForUseRequestIndex[record.Block_ID] - record.Block_Refs.length;
            if (restOfBlocks > 0) {
                for (; restOfBlocks > 0; restOfBlocks--) {
                    results.push({
                        type: record.Block_Type,
                        ref: null,
                        status: null,
                    });
                }
            }
        });

        return results;
    };

    const rotateTable = records => {
        return records.map(record => {
            const name = [record.type, record.ref].filter(el => !!el).join(' ');
            return [name, record.status];
        });
    };

    const store = records => {
        db.collection('blockActualWorkload').insertOne({workload: records});

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
