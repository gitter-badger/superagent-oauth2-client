import {Request, Response} from 'oauth2-client-js';

export default function(superagent) {
    /**
     * Just like superagent.end, but returning a promise.
     *
     * @return {Promise}
     */
    function end() {
        return new Promise((resolve, reject) => {
            this.end((error, res) => {
                if (error) {
                    return reject(error);
                }
                resolve(res);
            });
        });
    }

    function buildRequest(config, applyMetadataFn) {
        let authRequest = new Request(config);
        if (applyMetadataFn) {
            applyMetadataFn(authRequest);
        }
        return authRequest;
    }

    function requestAccessToken(provider, request) {
        let redirectionUri = provider.requestToken(request);
        // remember this request for later when we get a response
        provider.remember(request);
        // request is done via redirect to auth provider
        if (ENV_PRODUCTION) {
            window.location.href = redirectionUri;
        }
    }

    function useAccessToken(provider) {
        this.set('Authorization', `Token ${provider.getAccessToken()}`);
        return end.call(this);
    }

    function refreshAccessToken(provider) {
        let request = provider.refreshToken();
        provider.remember(request);
        return superagent
                .get(provider.encodeInUri(request))
                .exec();
    }

    function clone() {
        let doppelganger = new superagent.Request();
        doppelganger.method = this.method;
        doppelganger.url = this.url;
        doppelganger._query = this._query;
        return doppelganger;
    }

    superagent.Request.prototype.exec = function(applyMetadataFn) {
        // if this request doesn't have oauth enabled,
        // just execute it
        if (!this._oauthEnabled) {
            return end.call(this);
        }

        return new Promise((resolve, reject) => {
            let provider = this._oauthProvider,
                requestConfig = this._oauthRequestConfig,
                request = buildRequest(requestConfig, applyMetadataFn);

            if (provider.hasAccessToken()) {
                useAccessToken.call(this, provider)
                    .then(resp => {
                        // token was apparently ok
                        resolve(resp);
                    })  
                    .catch(accessError => {
                        if (accessError.status === 401 ) {
                            // Unauthorized
                            if (provider.hasRefreshToken()) {
                                refreshAccessToken(provider)
                                    .then(resp => {
                                        provider.handleResponse(new Response(resp.body));
                                        let _clone = clone.call(this);
                                        end.call(_clone).then(resolve).catch(reject);
                                    })
                                    .catch(refreshError => {
                                    });
                            } else {
                                // No refresh token, we need to request a new access token
                                reject(request);
                                return requestAccessToken(provider, request);
                            }
                        } else {
                            // We got an error, but the token appears to be valid
                            // reject and pass the error
                            return reject(accessError);
                        }
                    });
            } else {
                reject(request);
                return requestAccessToken(provider, request);
            }
        });
    };

    /**
     * Tell superagent to use a specific oauth provider.
     *
     * @param  {OAuthProvider} provider
     * @return {self} superagent
     */
    superagent.Request.prototype.oauth = function(provider, requestConfig) {
        this._oauthEnabled = true;
        this._oauthProvider = provider;
        this._oauthRequestConfig = requestConfig;
        return this;
    };

    return superagent;
};