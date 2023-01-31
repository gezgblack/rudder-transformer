const data = [
  {
    "name": "canny",
    "description": "Identify call for creating or updating user",
    "feature": "processor",
    "module": "destination",
    "version": "v0",
    "input": {
      "request": {
        "body": [{
          "destination": {
            "Config": {
              "apiKey": "FXLkLUEhGJyvmY4"
            }
          },
          "message": {
            "type": "identify",
            "sentAt": "2022-01-20T13:39:21.033Z",
            "userId": "user123456001",
            "channel": "web",
            "context": {
              "os": {
                "name": "",
                "version": ""
              },
              "app": {
                "name": "RudderLabs JavaScript SDK",
                "build": "1.0.0",
                "version": "1.2.20",
                "namespace": "com.rudderlabs.javascript"
              },
              "page": {
                "url": "http://127.0.0.1:7307/Testing/App_for_LaunchDarkly/ourSdk.html",
                "path": "/Testing/App_for_LaunchDarkly/ourSdk.html",
                "title": "Document",
                "search": "",
                "tab_url": "http://127.0.0.1:7307/Testing/App_for_LaunchDarkly/ourSdk.html",
                "referrer": "http://127.0.0.1:7307/Testing/App_for_LaunchDarkly/",
                "initial_referrer": "$direct",
                "referring_domain": "127.0.0.1:7307",
                "initial_referring_domain": ""
              },
              "locale": "en-US",
              "screen": {
                "width": 1440,
                "height": 900,
                "density": 2,
                "innerWidth": 536,
                "innerHeight": 689
              },
              "traits": {
                "city": "Pune",
                "name": "First User",
                "email": "firstUser@testmail.com",
                "title": "VP",
                "gender": "female",
                "avatar": "https://i.pravatar.cc/300"
              },
              "library": {
                "name": "RudderLabs JavaScript SDK",
                "version": "1.2.20"
              },
              "campaign": {},
              "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36"
            },
            "rudderId": "553b5522-c575-40a7-8072-9741c5f9a647",
            "messageId": "831f1fa5-de84-4f22-880a-4c3f23fc3f04",
            "anonymousId": "bf412108-0357-4330-b119-7305e767823c",
            "integrations": {
              "All": true
            },
            "originalTimestamp": "2022-01-20T13:39:21.032Z"
          }
        }],
        "headers": {
          
        },
        "params": {

        },
        "method": "POST"
      },
      "pathSuffix": ""
    },
    "output": {
      "response": {
        "status": 200,
        "body": [{
          "output": {
            "version": "1",
            "userId": "",
            "type": "REST",
            "method": "POST",
            "endpoint": "https://canny.io/api/v1/users/create_or_update",
            "headers": {
              "Authorization": "Basic FXLkLUEhGJyvmY4",
              "Content-Type": "application/json"
            },
            "params": {},
            "body": {
              "JSON": {
                "customFields": {
                  "city": "Pune",
                  "title": "VP",
                  "gender": "female"
                },
                "apiKey": "FXLkLUEhGJyvmY4",
                "userID": "user123456001",
                "email": "firstUser@testmail.com",
                "name": "First User",
                "created": "2022-01-20T13:39:21.032Z",
                "avatarURL": "https://i.pravatar.cc/300"
              },
              "JSON_ARRAY": {},
              "XML": {},
              "FORM": {}
            },
            "files": {}
          },
          "statusCode": 200
        }]
      }
    },
    "mock": [
      {
        "request": {
          "method": "POST",
          "body": "",
          "headers": {},
          "params": {}
        },
        "response": {
          "status": 200,
          "body": "",
          "headers": {}
        }
      }
    ]
  }
];

module.exports = {
  data
}
