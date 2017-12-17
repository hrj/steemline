<?php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\HttpFoundation\Request;

class DefaultController extends Controller
{
    /**
     * @Route("/", name="homepage")
     */
    public function indexAction()
    {
        return $this->render('default/index.html.twig');
    }

    /**
     * @Route("/authSteemconnect", name="auth from steem connect")
     */
    public function authAction(Request $request, SessionInterface $session)
    {
        $query = $request->query;
        if ($query->get('access_token')) {
            $session->set('access_token', $query->get('access_token'));
            $username = $query->get('username');
            $session->set('username', $username);
            return new Response("<body>
<h3>Authentication successful!</h3>
<h3>Click <a href='/'>here to continue</a> as <b>$username</b>.</h3>
</body>");
        }
        return new Response("<body><p>Access token not found</p></body>");
    }

    /**
     * @Route("/logout", name="logout")
     */
    public function logoutAction(SessionInterface $session)
    {
        $session->clear();
        return new Response("<body>
<h3>You have been logged out!</h3>
<h3>Click <a href='/'>here to continue</a>.</h3>
</body>");
    }

    /**
     * @Route("/test", name="testpage")
     */
    public function testAction(SessionInterface $session)
    {

        return new Response("<body>
<p>access token: " . $session->get('access_token', 'not set') . "</p>
<p>username: " . $session->get('username', 'not set') . "</p>
<h3>Click <a href='/'>here to continue to home page</a>.</h3>
<h3>Click <a href='/logout'>here to logout</a>.</h3>
</body>");
    }
}
