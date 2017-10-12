<?php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * @Route("/api")
 */
class ApiController extends Controller
{
    /**
     * @Route("/mentions", name="api_mentions")
     *
     * @param Request $request
     * @return JsonResponse
     * @throws \Exception
     */
    public function mentionsAction(Request $request)
    {
        if ($request->query->has('username')) {
            $username = $request->query->get('username');
            $comments = $request->query->get('comments') ?: 'N';
            $own = $request->query->get('own') ?: 'N';

            $mentions = file_get_contents('http://api.comprendre-steem.fr/getMentions?comments=' . $comments . '&own_comments=' . $own . '&username=' . $username);
            $json = json_decode($mentions);
            if ($json !== null) {
                return new JsonResponse($json);
            }

            throw new \Exception("Json decoding error.");
        }

        throw new \Exception("No username provided.");
    }

    /**
     * @Route("/votes", name="api_votes")
     *
     * @param Request $request
     * @return JsonResponse
     * @throws \Exception
     */
    public function votesAction(Request $request)
    {
        if ($request->query->has('username')) {
            $username = $request->query->get('username');

            // min 1
            $page = max((int) $request->query->get('page') ?: 1, 1);

            // min 0, max 100
            $perpage = min(max((int) $request->query->get('perpage') ?: 30, 0), 100);

            $offset = ($page * $perpage) - $perpage;

            $votes = file_get_contents('http://api.comprendre-steem.fr/getIncomingVotes?username=' . $username . '&offset=' . $offset . '&limit=' . $perpage);
            $json = json_decode($votes);
            if ($json !== null) {
                return new JsonResponse($json);
            }

            throw new \Exception("Json decoding error.");
        }

        throw new \Exception("No username provided.");
    }

    /**
     * @Route("/votesCount", name="api_votes_count")
     *
     * @param Request $request
     * @return JsonResponse
     * @throws \Exception
     */
    public function votesCountAction(Request $request)
    {
        if ($request->query->has('username')) {
            return new JsonResponse($this->getVotesCountRecursive(
                $request->query->get('username'),
                1,
                50000
            ));
        }

        throw new \Exception("No username provided.");
    }

    private function getVotesCountRecursive($username, $page, $perpage)
    {
        $votesCount = 0;

        $offset = ($page * $perpage) - $perpage;

        $votes = json_decode(file_get_contents('http://api.comprendre-steem.fr/getIncomingVotes?username=' . $username . '&offset=' . $offset . '&limit=' . $perpage));
        if ($votes && $votes->votes) {
            $votesCount += count($votes->votes);
            if (count($votes->votes) == $perpage) {
                $votesCount += $this->getVotesCountRecursive($username, $page + 1, $perpage);
            }


            return $votesCount;
        }

        throw new \Exception("Json decoding error.");
    }
}
