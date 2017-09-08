let steemDeck = new Vue({
    el: '#app',
    data: {
        account: null,
        addNewTag: null,
        addHotTag: null,
        addTrendingTag: null,
        addBlogUser: null,
        addFeedUser: null,
        rows: [],
        newRowId: 1
    },
    created: function () {
        if (loadFromLocalStorage('rows')) {
            this.rows = loadFromLocalStorage('rows');
        }
    },
    methods: {
        resetNewFollowers: function () {
            this.newFollowers = 0;
        },
        resetNewReplies: function () {
            this.newReplies = 0;
        },
        resetNewUpvotes: function () {
            this.newUpvotes = 0;
        },
        addRow: function (type, e) {
            e.preventDefault();
            UIkit.modal("#add-row").hide();
            switch (type) {
                case 'new':
                    this.rows.unshift({id: this.newRowId++, type: 'new', tag: this.addNewTag});
                    break;
                case 'hot':
                    this.rows.unshift({id: this.newRowId++, type: 'hot', tag: this.addHotTag});
                    break;
                case 'trending':
                    this.rows.unshift({id: this.newRowId++, type: 'trending', tag: this.addTrendingTag});
                    break;
                case 'blog':
                    this.rows.unshift({id: this.newRowId++, type: 'blog', tag: this.addBlogUser});
                    break;
                case 'feed':
                    this.rows.unshift({id: this.newRowId++, type: 'feed', tag: this.addFeedUser});
                    break;
            }
            saveToLocalStorage('rows', this.rows);
        },
        removeRow: function (key, $event) {
            $($event.target).parents('.row').css('max-width', $($event.target).parents('.row').outerWidth());
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
    },
    components: {
        'sd-top-bar': {
            template: '#top-bar-template',
            data: function () {
                return {
                    usernameQuery: null,
                    lookingUpAccount: false,
                    account: null,
                    accountTmp: null,
                    userInfo: {
                        account: null,
                        username: null,
                        profileImage: null,
                        meta: null,
                        reputation: null,
                        followers: null,
                        newFollowers: null,
                        following: null,
                        posts: null,
                        replies: null,
                        newReplies: null,
                        upvotes: null,
                        newUpvotes: null,
                        votingPower: null
                    },
                    updateUserInterval: null,
                    updateUserIntervalSeconds: 30
                }
            },
            created: function () {
                if (loadFromLocalStorage('username')) {
                    this.usernameQuery = loadFromLocalStorage('username');
                    this.lookupAccount(null, true);
                }
            },
            methods: {
                lookupAccount: function (e, setUserInfoIfFound) {
                    this.accountTmp = null;
                    this.lookingUpAccount = true;
                    steem.api.getAccounts([this.usernameQuery], (err, accounts) => {
                        if (!err) {
                            this.accountTmp = accounts[0];

                            if (setUserInfoIfFound) {
                                this.setUserInfo();
                            }
                        }

                        this.lookingUpAccount = false;
                    });
                },
                setUserInfo: function (e) {
                    if (e) {
                        e.preventDefault();
                    }
                    if (this.accountTmp) {
                        this.account = this.accountTmp;
                        this.updateUser();
                        saveToLocalStorage('username', this.usernameQuery);

                        clearInterval(this.updateUserInterval);
                        this.updateUserInterval = setInterval(() => {
                            this.updateUser();
                        }, this.updateUserIntervalSeconds * 1000);
                    }
                },
                updateUser: function () {
                    if (this.account) {
                        steem.api.getAccounts([this.account.name], (err, accounts) => {
                            if (!err) {
                                steem.api.getFollowCount(this.account.name, (err, followers) => {
                                    if (!err) {
                                        this.account = accounts[0];
                                        this.userInfo.account = this.account;
                                        this.userInfo.username = this.account.name;
                                        this.userInfo.reputation = calculateReputation(this.account.reputation, 0);
                                        this.userInfo.posts = this.account.post_count;
                                        this.userInfo.votingPower = calculateVotingPower(this.account.voting_power, this.account.last_vote_time);

                                        this.userInfo.profileImage = null;
                                        if (this.account.json_metadata) {
                                            let meta = JSON.parse(this.account.json_metadata);
                                            if (meta.profile && meta.profile.profile_image) {
                                                this.userInfo.profileImage = meta.profile.profile_image;
                                            }
                                        }

                                        this.userInfo.followers = followers.follower_count;
                                        this.userInfo.following = followers.following_count;
                                    }
                                });
                            }
                        });
                    }
                },
                resetAccount: function () {
                    this.account = null;
                    this.userInfo = {
                        account: null,
                        username: null,
                        profileImage: null,
                        meta: null,
                        reputation: null,
                        followers: null,
                        newFollowers: null,
                        following: null,
                        posts: null,
                        replies: null,
                        newReplies: null,
                        upvotes: null,
                        newUpvotes: null,
                        votingPower: null
                    };
                    saveToLocalStorage('username', false);
                    clearInterval(this.updateUserInterval);
                }
            },
        },
        'sd-bottom-bar': {
            template: '#bottom-bar-template',
            props: ['rows']
        },
        'sd-row': {
            template: '#row-template',
            props: ['rows', 'row', 'index'],
            data: function () {
                return {
                    posts: {},
                    newestPost: null,
                    newPosts: {},
                    getNewPostsIntervalSeconds: 5,
                    getNewPostsInterval: null
                }
            },
            created: function () {
                switch (this.row.type) {
                    case 'new':
                        steem.api.getDiscussionsByCreated({tag: this.row.tag, limit: 10}, (err, posts) => {
                            this.posts = posts;
                        });
                        break;
                }
            },
            destroyed: function () {
                clearInterval(this.updateInterval);
            },
            methods: {
                getNewPosts: function () {
                    switch (this.row.type) {
                        case 'new':
                            steem.api.getDiscussionsByCreated({tag: this.row.tag, limit: 10}, (err, posts) => {
                                this.posts = posts;
                            });
                            break;
                    }
                }
            },
            components: {
                'sd-post': {
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
                }
            }
        },
    }
});

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

function calculateReputation(reputation, precision) {
    let score = (reputation < 0 ? '-' : '') + ((((Math.log10(Math.abs(reputation))) - 9) * 9) + 25);

    return precision ? score.toFixed(2) : Math.floor(score);
}

function calculateVotingPower(votingPower, lastVoteTime) {
    let secondsPassedSinceLastVote = (new Date - new Date(lastVoteTime + "Z")) / 1000;
    votingPower += (10000 * secondsPassedSinceLastVote / 432000);

    return Math.min(votingPower / 100, 100).toFixed(2);
}

$('#followers').on('show.uk.modal', function () {
    steemDeck.resetNewFollowers();
});

$('#replies').on('show.uk.modal', function () {
    steemDeck.resetNewReplies();
});

$('#upvotes').on('show.uk.modal', function () {
    steemDeck.resetNewUpvotes();
});

$(document).on('focusitem.uk.slider', '.row', function (event, index) {
    var numberOfPosts = $(this).find('.post').length,
        visiblePosts = window.innerWidth > 767 ? (window.innerWidth > 959 ? 4 : 2) : 1;

    $(this).find('.scroll-indicator').css('width', (visiblePosts / numberOfPosts * 100).toFixed(2) + '%');
    $(this).find('.scroll-indicator').css('left', ((visiblePosts / numberOfPosts * 100) * (index / visiblePosts )).toFixed(2) + '%');
});

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