'use strict';
/**
 * Module exports.
 * @public
 */

const got = require('got');
const { google } = require('googleapis');
const youtubeService = google.youtube('v3');
const driveService = google.drive('v3');
const OAuth2 = google.auth.OAuth2;

exports.copyToYoutube = copyToYoutube;
exports.copyToGDrive = copyToGDrive;
/**
 * Get the media link (video url and thumb url) of the given google drive document id. 
 * @param {string} streamUrl
 * @param {string} streamTitle
 * @param {string} options.accessToken
 * @returns 
 */
async function copyToYoutube(streamUrl, streamTitle, options) {
    try {
        var title = streamTitle || `Some random title ${(new Date()).toISOString()}`;
        var requestData = createYoutubeRequest(title);
        var directUrl = streamUrl;

        got.stream(directUrl, {
            //encoding: null,
            responseType: 'buffer'
        }).on('data', function (chunk) {

        }).on('response', function (gotresponseinner) {
            var parameters = removeEmptyParameters(requestData['params']);
            parameters['auth'] = getAuth(options.accessToken);
            parameters['media'] = { body: gotresponseinner };
            parameters['notifySubscribers'] = false;
            parameters['resource'] = createResource(requestData['properties']);

            youtubeService.videos.insert(parameters, function (err, data) {
                if (err) {
                    console.log('The API returned an error: ' + err);
                    reject(err);
                } else {
                    console.log('The API successfully returned: ');
                    console.log('Data returned: ' + data);
                    var resp = createSuccessResponse();
                    resolve(resp);
                }
            });
        });
    } catch (error) {
        reject('Error while fetching the media link. ' + error);
    }
}

async function copyToGDrive(streamUrl, streamTitle, options) {
    try {
        var title = streamTitle || `Some random title ${(new Date()).toISOString()}`;
        got.stream(streamUrl, {
            //encoding: null,
            responseType: 'buffer'
        }).on('data', function (chunk) {

        }).on('response', function (gotresponseinner) {
            var fileMetadata = {
                'name': title
            };
            var media = {
                body: gotresponseinner
            };
            driveService.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id',
                auth: getAuth(options.accessToken)
            }, function (err, file) {
                if (err) {
                    console.error(err);
                    reject(`Error while uploading the media to google drive. ${error}`);
                } else {
                    console.log('File Id: ', file.data.id);
                    resolve(file);
                }
            });
        });
    } catch (error) {
        console.error(err);
        reject('Error while fetching the media link. ' + error);
    }
}

function createFailedResponse(status, error) {
    return {
        satusCode: status,
        error: error
    }
}

function createSuccessResponse() {
    return {
        statusCode: 'OK'
    };
}

function createYoutubeRequest(title) {
    var requestData = {
        'params': { 'part': 'snippet,status' },
        'properties': {
            'snippet.categoryId': '22',
            'snippet.defaultLanguage': '',
            'snippet.description': '',
            'snippet.tags[]': '',
            'snippet.title': title,
            'status.embeddable': '',
            'status.license': '',
            'status.privacyStatus': 'private',
            'status.publicStatsViewable': ''
        }
    };
    return requestData;
}


function createResource(properties) {
    var resource = {};
    var normalizedProps = properties;
    for (var p in properties) {
        var value = properties[p];
        if (p && p.substr(-2, 2) == '[]') {
            var adjustedName = p.replace('[]', '');
            if (value) {
                normalizedProps[adjustedName] = value.split(',');
            }
            delete normalizedProps[p];
        }
    }
    for (var p in normalizedProps) {
        // Leave properties that don't have values out of inserted resource.
        if (normalizedProps.hasOwnProperty(p) && normalizedProps[p]) {
            var propArray = p.split('.');
            var ref = resource;
            for (var pa = 0; pa < propArray.length; pa++) {
                var key = propArray[pa];
                if (pa == propArray.length - 1) {
                    ref[key] = normalizedProps[p];
                } else {
                    ref = ref[key] = ref[key] || {};
                }
            }
        };
    }
    return resource;
}


function removeEmptyParameters(params) {
    for (var p in params) {
        if (!params[p] || params[p] == 'undefined') {
            delete params[p];
        }
    }
    return params;
}

function getAuth(token) {
    var oauth2Client = new OAuth2();
    oauth2Client.credentials = {
        access_token: token
    };
    return oauth2Client;
}