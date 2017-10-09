<?php
/**
 * Created by PhpStorm.
 * User: mkt
 * Date: 28.09.17
 * Time: 12:58
 */

namespace AppBundle\Service;

use Doctrine\ORM\EntityManagerInterface;

class SteemClient
{
    /**
     * @var EntityManagerInterface
     */
    private $em;

    function __construct(EntityManagerInterface $em) {

        $this->em = $em;
    }

    public function getIncomingVotes($author) {
        $sql = "SELECT t.* FROM sbds.sbds_tx_votes t WHERE t.author = :author";
        $params = ['author' => $author];

        $stmt = $this->em->getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getMentions($author) {
        $sql = "SELECT c.* FROM sbds.sbds_tx_comments c WHERE c.body LIKE :author OR c.title LIKE :author";
        $params = ['author' => '%@' . $author . '%'];

        $stmt = $this->em->getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getReplies($author) {
        $sql = "SELECT c.* FROM sbds.sbds_tx_comments c WHERE c.parent_author = :author ORDER BY timestamp";
        $params = ['author' => $author];

        $stmt = $this->em->getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}