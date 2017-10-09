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
}
