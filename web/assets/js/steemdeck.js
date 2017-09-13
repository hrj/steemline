// Post
Vue.component('sw-post', {
    template: '#post-template',
    props: ['post'],
    data: function () {
        return {
            meta: {},
            image: null
        }
    },
    created: function () {
        this.meta = JSON.parse(this.post.json_metadata);

        if (this.meta.image) {
            this.image = this.meta.image[0];
        }
    }
});

// Row
Vue.component('sw-row', {
    template: '#row-template',
    props: ['rows', 'row', 'index'],
    data: function () {
        return {
            posts: [],
            postIds: [],
            newPosts: [],
            updateInterval: null,
            slider: null,
            refreshing: false
        }

    },
    created: function () {
        switch (this.row.type) {
            case 'new':
                steem.api.getDiscussionsByCreated({tag: this.row.tag, limit: 10}, (err, posts) => {
                    if (!err) {
                        this.initPosts(posts);
                        this.updateInterval = setInterval(this.getNewPosts, 10000);
                    }
                });
                break;
            case 'hot':
                steem.api.getDiscussionsByHot({tag: this.row.tag, limit: 10}, (err, posts) => {
                    if (!err) {
                        this.initPosts(posts);
                    }
                });
                break;
            case 'trending':
                steem.api.getDiscussionsByTrending({tag: this.row.tag, limit: 10}, (err, posts) => {
                    if (!err) {
                        this.initPosts(posts);
                    }
                });
                break;
            case 'blog':
                steem.api.getDiscussionsByBlog({tag: this.row.tag, limit: 10}, (err, posts) => {
                    if (!err) {
                        this.initPosts(posts);
                        this.updateInterval = setInterval(this.getNewPosts, 10000);
                    }
                });
                break;
            case 'feed':
                steem.api.getDiscussionsByFeed({tag: this.row.tag, limit: 10}, (err, posts) => {
                    if (!err) {
                        this.initPosts(posts);
                        this.updateInterval = setInterval(this.getNewPosts, 10000);
                    }
                });
                break;
        }
    },
    mounted: function () {
        this.slider = UIkit.slider(this.$el, {infinite: false, threshold: 50});
    },
    methods: {
        initPosts: function (posts) {
            this.posts = posts;
            this.posts.map((post) => {
                this.postIds.push(post.id);
            });
        },
        getNewPosts: function () {
            switch (this.row.type) {
                case 'new':
                    steem.api.getDiscussionsByCreated({tag: this.row.tag, limit: 10}, (err, posts) => {
                        if (!err) {
                            this.saveNewPosts(posts);
                        }
                    });
                    break;
                case 'blog':
                    steem.api.getDiscussionsByBlog({tag: this.row.tag, limit: 10}, (err, posts) => {
                        if (!err) {
                            this.saveNewPosts(posts);
                        }
                    });
                    break;
                case 'feed':
                    steem.api.getDiscussionsByFeed({tag: this.row.tag, limit: 10}, (err, posts) => {
                        if (!err) {
                            this.saveNewPosts(posts);
                        }
                    });
                    break;
            }
        },
        saveNewPosts: function (posts) {
            posts.map((post) => {
                if (this.postIds.indexOf(post.id) == -1) {
                    this.newPosts.push(post);
                    this.postIds.push(post.id);
                }
            });
        },
        showNewPosts: function () {
            this.posts = this.newPosts.concat(this.posts);
            this.newPosts = [];
            this.slider.updateFocus(0, -1);
        },
        getOlderPosts: function () {
            let lastPost = this.posts[this.posts.length - 1];
            switch (this.row.type) {
                case 'new':
                    steem.api.getDiscussionsByCreated({tag: this.row.tag, limit: 11, start_author: lastPost.author, start_permlink: lastPost.permlink}, (err, posts) => {
                        if (!err) {
                            posts.shift();
                            this.posts = this.posts.concat(posts);
                        }
                    });
                    break;
                case 'hot':
                    steem.api.getDiscussionsByHot({tag: this.row.tag, limit: 11, start_author: lastPost.author, start_permlink: lastPost.permlink}, (err, posts) => {
                        if (!err) {
                            posts.shift();
                            this.posts = this.posts.concat(posts);
                        }
                    });
                    break;
                case 'trending':
                    steem.api.getDiscussionsByTrending({tag: this.row.tag, limit: 11, start_author: lastPost.author, start_permlink: lastPost.permlink}, (err, posts) => {
                        if (!err) {
                            posts.shift();
                            this.posts = this.posts.concat(posts);
                        }
                    });
                    break;
                case 'blog':
                    steem.api.getDiscussionsByBlog({tag: this.row.tag, limit: 11, start_author: lastPost.author, start_permlink: lastPost.permlink}, (err, posts) => {
                        if (!err) {
                            posts.shift();
                            this.posts = this.posts.concat(posts);
                        }
                    });
                    break;
                case 'feed':
                    steem.api.getDiscussionsByFeed({tag: this.row.tag, limit: 11, start_author: lastPost.author, start_permlink: lastPost.permlink}, (err, posts) => {
                        if (!err) {
                            posts.shift();
                            this.posts = this.posts.concat(posts);
                        }
                    });
                    break;
            }
        },
        refreshPosts: function () {
            this.refreshing = true;
            switch (this.row.type) {
                case 'hot':
                    steem.api.getDiscussionsByHot({tag: this.row.tag, limit: 10}, (err, posts) => {
                        if (!err) {
                            this.posts = posts;
                            this.refreshing = false;
                            this.slider.updateFocus(0, -1);
                        }
                    });
                    break;
                case 'trending':
                    steem.api.getDiscussionsByTrending({tag: this.row.tag, limit: 10}, (err, posts) => {
                        if (!err) {
                            this.posts = posts;
                            this.refreshing = false;
                            this.slider.updateFocus(0, -1);
                        }
                    });
                    break;
            }
        }
    }
});

// Main App
let SteemWall = new Vue({
    el: '#steemwall',
    data: {
        connecting: true,
        account: null,
        rows: [
            {
                id: 1,
                type: 'new',
                tag: 'steemit'
            },
            {
                id: 2,
                type: 'trending',
                tag: 'steemdev'
            }
        ],
        newRowId: 3
    },
    computed: {
        metaData: function () {
            if (this.account && this.account.json_metadata) {
                return JSON.parse(this.account.json_metadata);
            }
            return null;
        },
        profile: function () {
            if (this.metaData && this.metaData.profile) {
                return this.metaData.profile;
            }
            return null;
        },
        profileImage: function () {
            if (this.profile && this.profile.profile_image) {
                return this.profile.profile_image;
            }
            return null;
        },
        coverImage: function () {
            if (this.profile && this.profile.cover_image) {
                return this.profile.cover_image;
            }
            return null;
        },
        reputation: function () {
            return calculateReputation(this.account.reputation, 2);
        },
        votingPower: function () {
            return calculateVotingPower(this.account.voting_power, this.account.last_vote_time, 2);
        }
    },
    created: function () {
        steemconnect.init({
            app: appName,
            callbackURL: redirectUri
        });

        steemconnect.isAuthenticated((error, auth) => {
            if (!error && auth.isAuthenticated) {
                steem.api.getAccounts([auth.username], (error, accounts) => {
                    this.account = accounts[0];
                    this.connecting = false;

                    setInterval(this.updateAccount, 10000);
                });
            } else {
                this.connecting = false;
            }
        });

        // load rows from local storage
    },
    methods: {
        updateAccount: function () {
            steem.api.getAccounts([this.account.name], (error, accounts) => {
                this.account = accounts[0];
            });
        },
        removeRow: function (key, $event) {
            $($event.target).parents('.row').css('width', $($event.target).parents('.row').outerWidth());
            this.rows.splice(key, 1);
            saveToLocalStorage('rows', this.rows);
        },
        rowUp: function (key) {
            if (key > 0) {
                this.rows[key] = this.rows.splice(key - 1, 1, this.rows[key])[0];
                saveToLocalStorage('rows', this.rows);
            }
        },
        rowDown: function (key) {
            if (key < this.rows.length - 1) {
                this.rows[key] = this.rows.splice(key + 1, 1, this.rows[key])[0];
                saveToLocalStorage('rows', this.rows);
            }
        }
    }
});

// calculate scroll indicator position and width
$(document).on('focusitem.uk.slider', '.row', function (event, index) {
    let numberOfPosts = $(this).find('.post').length,
        visiblePosts = window.innerWidth > 767 ? (window.innerWidth > 959 ? 4 : 2) : 1;

    $(this).find('.scroll-indicator').css('width', (visiblePosts / numberOfPosts * 100).toFixed(2) + '%');
    $(this).find('.scroll-indicator').css('left', ((visiblePosts / numberOfPosts * 100) * (index / visiblePosts )).toFixed(2) + '%');
});

// handling swipe and click on posts
let cursorPosition = {};

$(document).on('mousedown', '.open-post', function (e) {
    cursorPosition.x = e.clientX;
    cursorPosition.y = e.clientY;
});

$(document).on('mouseup', '.open-post', function (e) {
    if (Math.abs(cursorPosition.x - e.clientX) < 25 && Math.abs(cursorPosition.y - e.clientY) < 25) {
        let modal = UIkit.modal('#post');

        if (modal.isActive()) {
            modal.hide();
        } else {
            modal.show();
        }
    }
});

// Helper Functions

function calculateReputation(reputation, precision) {
    let score = parseFloat((reputation < 0 ? '-' : '') + ((((Math.log10(Math.abs(reputation))) - 9) * 9) + 25));

    return precision ? score.toFixed(precision) : Math.floor(score);
}

function calculateVotingPower(votingPower, lastVoteTime, precision) {
    let secondsPassedSinceLastVote = (new Date - new Date(lastVoteTime + "Z")) / 1000;
    votingPower += (10000 * secondsPassedSinceLastVote / 432000);

    return Math.min(votingPower / 100, 100).toFixed(precision);
}

function saveToLocalStorage(key, value) {
    if (typeof(Storage) !== "undefined") {
        localStorage.setItem(key, JSON.stringify(value));
    }
}

function loadFromLocalStorage(key) {
    if (typeof(Storage) !== "undefined") {
        return JSON.parse(localStorage.getItem(key));
    }
}