// Push JS
if (!Push.Permission.has()) {
    Push.Permission.request();
}

// Event Container
let events = new Vue();

// Remarkable
let remarkable = new Remarkable({
    html: true,
    breaks: true,
    linkify: false,
    typographer: false,
    quotes: '“”‘’'
});

// Post Mixin
let postMixin = {
    props: ['post', 'account'],
    data: function () {
        return {
            meta: {},
            profileMeta: {},
            image: null,
            tags: [],
            voting: false,
            votingPower: 100,
            cursorPosition: {x: 0, y: 0},
            replies: {},
            repliesLoading: false,
            showReplyTextarea: false,
            replying: false
        }
    },
    computed: {
        postCreated: function () {
            return moment.utc(new Date(this.post.created)).from(moment.utc().format('YYYY-MM-DD HH:mm:ss'));
        },
        postBody: function () {
            return replaceMedia(remarkable.render(this.post.body));
        },
        authorReputation: function () {
            return calculateReputation(this.post.author_reputation, 0);
        },
        payout: function() {
            if (this.post.last_payout == '1970-01-01T00:00:00') {
                let payout = this.post.pending_payout_value.replace(' SBD', '');
                return parseFloat(payout).toFixed(2);
            }

            let authorPayout = this.post.total_payout_value.replace(' SBD', ''),
                curatorPayout = this.post.curator_payout_value.replace(' SBD', '');

            return (parseFloat(authorPayout) + parseFloat(curatorPayout)).toFixed(2);
        }
    },
    created: function () {
        if (this.post.json_metadata) {
            this.meta = JSON.parse(this.post.json_metadata);

            if (this.meta) {
                if (this.meta.image) {
                    this.image = this.meta.image[0];
                }

                if (this.meta.tags) {
                    this.tags = this.meta.tags;
                }
            }
        }

        steem.api.getAccounts([this.post.author], (err, response) => {
            if (!err && response.length && response[0].json_metadata) {
                this.profileMeta = JSON.parse(response[0].json_metadata).profile;
            }
        });
    },
    methods: {
        vote: function () {
            if (this.account) {
                this.voting = true;
                steemconnect.vote(this.account.name, this.post.author, this.post.permlink, this.votingPower * 100, (err, result) => {
                    this.voting = false;

                    if (!err) {
                        steem.api.getContent(this.post.author, this.post.permlink, (err, result) => {
                            this.post = result;

                            UIkit.dropdown('#post-vote-dropdown-' + this.post.id).hide();
                        });
                    } else {
                        UIkit.notify({
                            message : '<b>Error</b>: Maximum allowed changes exceeded!',
                            status  : 'danger',
                            timeout : 5000,
                            pos     : 'top-center'
                        });
                    }
                });
            }
        },
        removeVote: function () {
            if (this.account) {
                this.voting = true;
                steemconnect.vote(this.account.name, this.post.author, this.post.permlink, 0, (err, result) => {
                    this.voting = false;

                    if (!err) {
                        steem.api.getContent(this.post.author, this.post.permlink, (err, result) => {
                            this.post = result;

                            UIkit.dropdown('#post-vote-dropdown-' + this.post.id).hide();
                        });
                    } else {
                        UIkit.notify({
                            message : '<b>Error</b>: Maximum allowed changes exceeded!',
                            status  : 'danger',
                            timeout : 5000,
                            pos     : 'top-center'
                        });
                    }
                });
            }
        },
        isUpvoted: function () {
            if (this.account) {
                for (let i = 0; i < this.post.active_votes.length; i++) {
                    if (this.post.active_votes[i].voter == this.account.name && this.post.active_votes[i].percent > 0) {
                        return true;
                    }
                }
            }
            return false;
        },
        submitReply: function (e) {
            e.preventDefault();
            if (this.account) {
                this.replying = true;
                let replyTextarea = $(e.target).find('.reply-textarea');
                let reply = replyTextarea.val();
                let date = new Date();
                let replyPermlink = 're-' + this.post.author + '-' + this.post.permlink + '-' + date.toISOString().replace(/[.:-]/g, '').toLowerCase();
                steemconnect.comment(this.post.author, this.post.permlink, this.account.name, replyPermlink, "", reply, null, (err, result) => {
                    this.replying = false;
                    if (!err) {
                        this.showReplyTextarea = false;
                        this.repliesLoading = true;
                        this.replies = {};
                        this.fetchReplies(this.post.author, this.post.permlink);
                        setTimeout(() => {
                            let newReply = $('#' + replyPermlink);
                            if (newReply.length) {
                                window.location.hash = '#' + replyPermlink;
                                newReply.effect("highlight", {}, 2000);
                            }
                        }, 1000);
                    } else {
                        UIkit.notify({
                            message : 'Error: Comment not sent due to an unexpected error! Try again later.',
                            status  : 'danger',
                            timeout : 5000,
                            pos     : 'top-center'
                        });
                    }
                });
            }
        },
        renderReply: function (e) {
            $(e.target).parent().find('.preview').html(remarkable.render(e.target.value));
        },
        fetchReplies: function (author, permlink) {
            return steem.api.getContentReplies(author, permlink, (err, result) => {
                if (!err) {
                    this.replies = result;
                }
                this.repliesLoading = false;
            });
        }
    }
};

// Post
Vue.component('sw-post', {
    template: '#post-template',
    mixins: [postMixin],
    methods: {
        startOpenThreshold: function ($event) {
            this.cursorPosition.x = $event.clientX;
            this.cursorPosition.y = $event.clientY;
        },
        open: function ($event) {
            if (Math.abs(this.cursorPosition.x - $event.clientX) < 25 && Math.abs(this.cursorPosition.y - $event.clientY) < 25) {
                events.$emit('showPost', this.post);
            }
        }
    }
});

// Post Modal
Vue.component('sw-post-modal', {
    template: '#post-modal-template',
    mixins: [postMixin],
    mounted: function () {
        this.repliesLoading = true;
        this.fetchReplies(this.post.author, this.post.permlink);
    }
});

// Reply
Vue.component('sw-reply', {
    template: '#reply-template',
    mixins: [postMixin],
    mounted: function () {
        this.repliesLoading = true;
        this.fetchReplies(this.post.author, this.post.permlink);
    }
});

// Line
Vue.component('sw-line', {
    template: '#line-template',
    props: ['lines', 'line', 'index', 'account'],
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
        switch (this.line.type) {
            case 'new':
                steem.api.getDiscussionsByCreated({tag: this.line.tag, limit: 10}, (err, posts) => {
                    if (!err) {
                        this.initPosts(posts);
                        this.updateInterval = setInterval(this.getNewPosts, 10000);
                    }
                });
                break;
            case 'hot':
                steem.api.getDiscussionsByHot({tag: this.line.tag, limit: 10}, (err, posts) => {
                    if (!err) {
                        this.initPosts(posts);
                    }
                });
                break;
            case 'trending':
                steem.api.getDiscussionsByTrending({tag: this.line.tag, limit: 10}, (err, posts) => {
                    if (!err) {
                        this.initPosts(posts);
                    }
                });
                break;
            case 'blog':
                steem.api.getDiscussionsByBlog({tag: this.line.tag, limit: 10}, (err, posts) => {
                    if (!err) {
                        this.initPosts(posts);
                        this.updateInterval = setInterval(this.getNewPosts, 10000);
                    }
                });
                break;
            case 'feed':
                steem.api.getDiscussionsByFeed({tag: this.line.tag, limit: 10}, (err, posts) => {
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
            switch (this.line.type) {
                case 'new':
                    steem.api.getDiscussionsByCreated({tag: this.line.tag, limit: 10}, (err, posts) => {
                        if (!err) {
                            this.saveNewPosts(posts);
                        }
                    });
                    break;
                case 'blog':
                    steem.api.getDiscussionsByBlog({tag: this.line.tag, limit: 10}, (err, posts) => {
                        if (!err) {
                            this.saveNewPosts(posts);
                        }
                    });
                    break;
                case 'feed':
                    steem.api.getDiscussionsByFeed({tag: this.line.tag, limit: 10}, (err, posts) => {
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
        showNewPosts: function ($event) {
            $event.preventDefault();
            this.posts = this.newPosts.concat(this.posts);
            this.newPosts = [];
            this.slider.updateFocus(0, -1);
        },
        getOlderPosts: function ($event) {
            $event.preventDefault();
            let lastPost = this.posts[this.posts.length - 1];
            switch (this.line.type) {
                case 'new':
                    steem.api.getDiscussionsByCreated({tag: this.line.tag, limit: 11, start_author: lastPost.author, start_permlink: lastPost.permlink}, (err, posts) => {
                        if (!err) {
                            posts.shift();
                            this.posts = this.posts.concat(posts);
                        }
                    });
                    break;
                case 'hot':
                    steem.api.getDiscussionsByHot({tag: this.line.tag, limit: 11, start_author: lastPost.author, start_permlink: lastPost.permlink}, (err, posts) => {
                        if (!err) {
                            posts.shift();
                            this.posts = this.posts.concat(posts);
                        }
                    });
                    break;
                case 'trending':
                    steem.api.getDiscussionsByTrending({tag: this.line.tag, limit: 11, start_author: lastPost.author, start_permlink: lastPost.permlink}, (err, posts) => {
                        if (!err) {
                            posts.shift();
                            this.posts = this.posts.concat(posts);
                        }
                    });
                    break;
                case 'blog':
                    steem.api.getDiscussionsByBlog({tag: this.line.tag, limit: 11, start_author: lastPost.author, start_permlink: lastPost.permlink}, (err, posts) => {
                        if (!err) {
                            posts.shift();
                            this.posts = this.posts.concat(posts);
                        }
                    });
                    break;
                case 'feed':
                    steem.api.getDiscussionsByFeed({tag: this.line.tag, limit: 11, start_author: lastPost.author, start_permlink: lastPost.permlink}, (err, posts) => {
                        if (!err) {
                            posts.shift();
                            this.posts = this.posts.concat(posts);
                        }
                    });
                    break;
            }
        },
        refreshPosts: function ($event) {
            $event.preventDefault();
            this.refreshing = true;
            switch (this.line.type) {
                case 'hot':
                    steem.api.getDiscussionsByHot({tag: this.line.tag, limit: 10}, (err, posts) => {
                        if (!err) {
                            this.posts = posts;
                            this.refreshing = false;
                            this.slider.updateFocus(0, -1);
                        }
                    });
                    break;
                case 'trending':
                    steem.api.getDiscussionsByTrending({tag: this.line.tag, limit: 10}, (err, posts) => {
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
let SteemLine = new Vue({
    el: '#steemline',
    data: {
        connecting: true,
        account: null,
        mentions: null,
        newMentions: 0,
        votes: null,
        newVotes: 0,
        votesCount: 0,
        followers: null,
        lines: [],
        defaultLines: [
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
        newLineId: 3,
        addNewTag: null,
        addHotTag: null,
        addTrendingTag: null,
        addBlogUser: null,
        addFeedUser: null,
        post: null,
        postModal: null,
        currentDraft: '',
        currentDraftTitle: '',
        currentDraftTags: '',
        saveDraftTimeout: null,
        submitting: false
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
	steemconnect = sc2;
        steemconnect.init({
            app: "steemline.app",
            callbackURL: sf.redirectUri,
            scope: ['vote', 'comment']
        });

	if (sf.access_token) {
	  sc2.setAccessToken(sf.access_token);
	  sc2.me((err, result) => {
	    this.connecting = false;
	    this.account = result.account;
	    this.updateAccount();
	    setInterval(this.updateAccount, 30000);
	  });
	} else {
	  this.connecting = false;
	}

        if (loadFromLocalStorage('lines')) {
            this.lines = loadFromLocalStorage('lines');
        } else {
            this.lines = this.defaultLines;
        }

        if (loadFromLocalStorage('currentDraft')) {
            this.currentDraft = loadFromLocalStorage('currentDraft');
        }
        if (loadFromLocalStorage('currentDraftTitle')) {
            this.currentDraftTitle = loadFromLocalStorage('currentDraftTitle');
        }
        if (loadFromLocalStorage('currentDraftTags')) {
            this.currentDraftTags = loadFromLocalStorage('currentDraftTags');
        }

        events.$on('showPost', (post) => {
            this.post = post;
            setTimeout(() => {
                this.postModal = UIkit.modal('#post');
                this.postModal.show();
            }, 250);
        });

        $(document).on('hide.uk.modal', '#post', () => {
            this.post = this.postModal = null;
        });

        $(document).on('hide.uk.modal', '#mentions', () => {
            this.newMentions = 0;
        });

        $(document).on('hide.uk.modal', '#votes', () => {
            this.newVotes = 0;
        });
    },
    methods: {
        updateAccount: function () {
		this.updateMentions();
		this.updateFollowers();
		this.updateVotes();
        },
        updateMentions: function () {
            if (this.account) {
                $.getJSON(sf.host + 'api/mentions?comments=Y&own=Y&username=' + this.account.name, (response) => {
                    if (this.mentions != null && response.size > this.mentions.length) {
                        this.newMentions += response.size - this.mentions.length;
                        if (Push.Permission.has()) {
                            Push.create("You were mentioned!", {
                                body: "You have been mentioned by " + response[0].author + ' in ' + response[0].title + '!',
                                icon: 'assets/img/app-icon.png',
                                timeout: 5000,
                                onClick: function () {
                                    window.focus();
                                    this.close();
                                }
                            });
                        }
                    }
                    this.mentions = response.mentions;
                });
            }
        },
        updateFollowers: function () {
            if (this.account) {
                steem.api.getFollowCount(this.account.name, (err, result) => {
                    if (!err) {
                        this.followers = result;
                    }
                });
            }
        },
        updateVotes: function () {
            if (this.account) {
                $.getJSON(sf.host + 'api/votes?username=' + this.account.name + '&perpage=500', (response) => {
                    if (this.votes) {
                        let diff = this.votes.filter(votesDiff(response.votes));
                        if (diff.length) {
                            this.newVotes += diff.length;
                            if (Push.Permission.has()) {
                                Push.create("Incoming vote!", {
                                    body: "You have " + diff.length + ' new vote' + (diff.length > 1 ? 's' : '') + '!',
                                    icon: 'assets/img/app-icon.png',
                                    timeout: 5000,
                                    onClick: function () {
                                        window.focus();
                                        this.close();
                                    }
                                });
                            }
                        }
                    }
                    this.votes = response.votes;
                });

                $.getJSON(sf.host + 'api/votesCount?username=' + this.account.name, (response) => {
                    this.votesCount = response;
                });
            }
        },
        removeLine: function (key, $event) {
            $event.preventDefault();
            $($event.target).parents('.line').css('width', $($event.target).parents('.line').outerWidth());
            this.lines.splice(key, 1);
            saveToLocalStorage('lines', this.lines);
            setTimeout(function() {$(window).resize();}, 750);
        },
        lineUp: function (key, $event) {
            $event.preventDefault();
            if (key > 0) {
                this.lines[key] = this.lines.splice(key - 1, 1, this.lines[key])[0];
                saveToLocalStorage('lines', this.lines);
            }
        },
        lineDown: function (key, $event) {
            $event.preventDefault();
            if (key < this.lines.length - 1) {
                this.lines[key] = this.lines.splice(key + 1, 1, this.lines[key])[0];
                saveToLocalStorage('lines', this.lines);
            }
        },
        addLine: function (type, e) {
            e.preventDefault();
            UIkit.modal("#add-line").hide();
            switch (type) {
                case 'new':
                    this.lines.unshift({id: this.newLineId++, type: 'new', tag: this.addNewTag});
                    break;
                case 'hot':
                    this.lines.unshift({id: this.newLineId++, type: 'hot', tag: this.addHotTag});
                    break;
                case 'trending':
                    this.lines.unshift({id: this.newLineId++, type: 'trending', tag: this.addTrendingTag});
                    break;
                case 'blog':
                    this.lines.unshift({id: this.newLineId++, type: 'blog', tag: this.addBlogUser});
                    break;
                case 'feed':
                    this.lines.unshift({id: this.newLineId++, type: 'feed', tag: this.addFeedUser});
                    break;
            }
            saveToLocalStorage('lines', this.lines);
        },
        saveCurrentDraft: function () {
            if (this.saveDraftTimeout) {
                clearTimeout(this.saveDraftTimeout);
            }

            this.saveDraftTimeout = setTimeout(() => {
                saveToLocalStorage('currentDraft', this.currentDraft);
                saveToLocalStorage('currentDraftTitle', this.currentDraftTitle);
                saveToLocalStorage('currentDraftTags', this.currentDraftTags);
            }, 2000);
        },
        renderedDraft: function () {
            return replaceMedia(remarkable.render($('#submit-story-body').val()));
        },
        submitStory: function (e) {
            e.preventDefault();
            this.submitting = true;
            let tags = this.currentDraftTags.toLowerCase().split(' ');
            let metaData = {tags: tags, app: 'steemline/beta'};
            let permlink = slugify(this.currentDraftTitle);
            if (permlink.length > 256) {
                permlink = permlink.substr(0, 255);
            }

            steemconnect.comment("", tags[0], this.account.name, permlink, this.currentDraftTitle, this.currentDraft, JSON.stringify(metaData), (err, result) => {
                if (!err) {
                    this.currentDraft = '';
                    this.currentDraftTitle = '';
                    this.currentDraftTags = '';
                    saveToLocalStorage('currentDraft', '');
                    saveToLocalStorage('currentDraftTitle', '');
                    saveToLocalStorage('currentDraftTags', '');
                    UIkit.modal("#submit-story").hide();

                    steem.api.getContent(this.account.name, permlink, (err, result) => {
                        if (!err) {
                            events.$emit('showPost', result);
                        }
                    });
                } else {
                    UIkit.notify({
                        message : 'Error: Post not sent due to an unexpected error! Try again later.',
                        status  : 'danger',
                        timeout : 5000,
                        pos     : 'top-center'
                    });
                }
                this.submitting = false;
            });
        }
    }
});

// calculate scroll indicator position and width
$(document).on('focusitem.uk.slider', '.line', function (event, index) {
    let numberOfPosts = $(this).find('.post').length,
        visiblePosts = window.innerWidth > 767 ? (window.innerWidth > 959 ? 4 : 2) : 1;

    $(this).find('.scroll-indicator').css('width', (visiblePosts / numberOfPosts * 100).toFixed(2) + '%');
    $(this).find('.scroll-indicator').css('left', ((visiblePosts / numberOfPosts * 100) * (index / visiblePosts )).toFixed(2) + '%');
});

// Helper Functions

function calculateReputation(reputation, precision) {
    if (reputation) {
        let score = parseFloat((reputation < 0 ? '-' : '') + ((((Math.log10(Math.abs(reputation))) - 9) * 9) + 25));

        return precision ? score.toFixed(precision) : Math.floor(score);
    }

    return 25;
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

function replaceMedia(body) {
    return body
        .replace(/((https?:)?\/\/?[^'"<>]+?\.(jpg|jpeg|gif|png))(?!")/ig, '<img src="$1" style="width: 100%;" />')
        .replace(/(^http:\/\/(?:www\.)?youtube.com\/watch\?(?=[^?]*v=\w+)(?:[^\s?]+)?$)/ig, '$1 <iframe width="150" height="150" src="http://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe>')
        ;
}

function slugify (title) {
    const a = 'àáäâèéëêìíïîòóöôùúüûñçßÿœæŕśńṕẃǵǹḿǘẍźḧ·/_,:;';
    const b = 'aaaaeeeeiiiioooouuuuncsyoarsnpwgnmuxzh------';
    const p = new RegExp(a.split('').join('|'), 'g');

    return title.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(p, c =>
            b.charAt(a.indexOf(c)))     // Replace special chars
        .replace(/&/g, '-and-')         // Replace & with 'and'
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '')             // Trim - from end of text
}

function votesDiff(otherArray){
    return function(current){
        return otherArray.filter(function(other){
            return other.author == current.author
                && other.voter == current.voter
                // && other.weight == current.weight
                && other.permlink == current.permlink
                && other.timestamp == current.timestamp;
        }).length == 0;
    }
}
