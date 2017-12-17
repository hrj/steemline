<?php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\RedirectResponse;
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
     * @Route("/auth", name="auth_steemconnect")
     * @param Request $request
     * @param SessionInterface $session
     * @return RedirectResponse|Response
     */
    public function authAction(Request $request, SessionInterface $session)
    {
        $query = $request->query;
        if ($query->get('access_token')) {
            $session->set('access_token', $query->get('access_token'));
            $username = $query->get('username');
            $session->set('username', $username);
            return new RedirectResponse($this->generateUrl('homepage'));
        }
        return new Response("<body><p>Access token not found</p></body>");
    }

    /**
     * @Route("/logout", name="logout")
     * @param SessionInterface $session
     * @return RedirectResponse
     */
    public function logoutAction(SessionInterface $session)
    {
        $session->clear();
        return new RedirectResponse($this->generateUrl('homepage'));
    }
}
